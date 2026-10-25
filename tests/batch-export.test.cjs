const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const JSZip = require('jszip');

const script = fs.readFileSync(path.join(__dirname, '..', '超星优学院答案保存为word.user.js'), 'utf8');
// 学习通实页结构：studentstudy -> cards -> work -> 已批阅试卷。
const quiz = (title = '专题六') => `<div class="ceyan_name"><h3>${title}</h3></div>
  <div class="TiMu"><div class="Zy_TItle"><i>1</i><div class="qtContent"><span class="newZy_TItle">【单选题】</span>测试题干 &amp; 内容</div></div>
  <ul class="Zy_ulTop"><li><i>A、</i><a>选项甲</a></li><li><i>B、</i><a>选项乙</a></li></ul>
  <div class="myAnswerBx"><div class="answerCon">A</div></div><div class="CorrectOrNot"><span class="marking_dui"></span></div><span class="scoreNum">1.6</span></div>`;

function chapter(id, name, completed = true) {
  return `<li><div class="posCatalog_title">${name}</div><div class="posCatalog_level"><div class="posCatalog_select" id="cur${id}">
  <span class="posCatalog_name">章节测试</span>${completed ? '<span class="icon_Completed"></span>' : ''}</div></div></li>`;
}

function setup({ html, url = 'https://mooc1.chaoxing.com/mycourse/studentstudy', reviews = {} }) {
  const dom = new JSDOM(html, { url, runScripts: 'outside-only' });
  const w = dom.window;
  const saved = [];
  const loaded = [];
  const removed = [];
  const alerts = [];
  w.JSZip = JSZip;
  w.saveAs = (blob, name) => saved.push({ blob, name });
  w.alert = message => alerts.push(message);
  w.AbortController = AbortController;
  w.AbortSignal = AbortSignal;
  const create = w.document.createElement.bind(w.document);
  w.document.createElement = tag => {
    const node = create(tag);
    if (tag === 'iframe') {
      const remove = node.remove.bind(node);
      node.remove = () => { removed.push(node.src); remove(); };
      Object.defineProperty(node, 'contentDocument', { get() {
        const u = new URL(node.src);
        const key = u.searchParams.get('knowledgeid') || u.pathname;
        if (!loaded.includes(key)) loaded.push(key);
        const review = reviews[key];
        if (!review) return null;
        if (!node.review) {
          node.review = new JSDOM(review, { url: 'https://mooc1.chaoxing.com/mooc-ans/work/selectWorkQuestionYiPiYue?workId=' + key });
        }
        return node.review.window.document;
      } });
    }
    return node;
  };
  w.eval(script);
  return { dom, w, saved, loaded, removed, alerts };
}

async function until(predicate) {
  const end = Date.now() + 6000;
  while (!predicate()) {
    if (Date.now() > end) throw new Error('等待导出结果超时');
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

function open(t) {
  t.w.document.querySelector('#cx-word-batch-open').click();
  return t.w.document.querySelector('#cx-word-batch-panel');
}

test('批量识别已完成测试、保序打包，同名文件不覆盖，原始题目不变', async () => {
  const t = setup({ html: `<iframe id="iframe" src="/mooc-ans/knowledge/cards?knowledgeid=2&courseid=10&num=0"></iframe><ul>${chapter(1, '专题一')}${chapter(2, '专题二')}${chapter(3, '未完成', false)}</ul>`, reviews: { 1: quiz(), 2: quiz() } });
  try {
    const panel = open(t);
    assert.equal(panel.querySelectorAll('input').length, 2);
    panel.querySelector('[data-start]').click();
    panel.querySelector('[data-start]').click();
    await until(() => t.saved.length);
    assert.deepEqual(t.loaded, ['1', '2']);
    assert.equal(t.removed.length, 2);
    assert.match(t.saved[0].name, /\.zip$/);
    const archive = await JSZip.loadAsync(await t.saved[0].blob.arrayBuffer());
    const docs = Object.keys(archive.files).filter(name => name.endsWith('.docx'));
    assert.deepEqual(docs, ['001_专题六.docx', '002_专题六.docx']);
    const doc = await JSZip.loadAsync(await archive.file(docs[0]).async('nodebuffer'));
    const xml = await doc.file('word/document.xml').async('string');
    assert.match(xml, /测试题干 &amp; 内容/);
    assert.match(xml, /A、 选项甲/);
    assert.match(xml, /我的答案：A/);
    assert.doesNotMatch(xml, /<w:t>[^<]*<w:br\/>/);
    assert.doesNotMatch(xml, /正确答案：/);
    assert.match(await archive.file('导出清单.txt').async('string'), /成功 2，失败 0/);
    assert.equal(t.saved.length, 1);
  } finally { t.dom.window.close(); }
});

test('单份导出复用相同导出器，保持题目 DOM 和选项不变', async () => {
  const t = setup({ html: quiz('A/B : 测试'), url: 'https://mooc1.chaoxing.com/mooc-ans/work/selectWorkQuestionYiPiYue' });
  try {
    const before = t.w.document.querySelector('.TiMu').outerHTML;
    const button = [...t.w.document.querySelectorAll('button')].find(el => el.innerText?.includes('双击'));
    button.dispatchEvent(new t.w.Event('dblclick'));
    await until(() => t.saved.length);
    assert.equal(t.saved[0].name, 'A_B _ 测试.docx');
    assert.equal(t.w.document.querySelector('.TiMu').outerHTML, before);
    assert.equal(button.disabled, false);
    assert.deepEqual(t.alerts, []);
  } finally { t.dom.window.close(); }
});

test('取消后保存已完成部分，清理后台 iframe，可重新操作', async () => {
  const t = setup({ html: `<iframe id="iframe" src="/mooc-ans/knowledge/cards"></iframe><ul>${chapter(1, '专题一')}${chapter(2, '专题二')}</ul>`, reviews: { 1: quiz() } });
  try {
    const panel = open(t);
    panel.querySelector('[data-start]').click();
    await until(() => panel.querySelector('[data-results]').textContent.includes('成功'));
    panel.querySelector('[data-cancel]').click();
    await until(() => t.saved.length && !panel.querySelector('[data-start]').disabled);
    assert.match(panel.querySelector('[data-status]').textContent, /已取消：成功 1/);
    assert.equal(t.removed.length, 2);
    assert.equal(t.w.document.querySelectorAll('iframe').length, 1);
    const archive = await JSZip.loadAsync(await t.saved[0].blob.arrayBuffer());
    assert.equal(Object.keys(archive.files).filter(name => name.endsWith('.docx')).length, 1);
  } finally { t.dom.window.close(); }
});

test('无选择和跨站链接不会创建后台请求；手动链接去重', async () => {
  const t = setup({ html: '', reviews: { '/mooc-ans/work/selectWorkQuestionYiPiYue': quiz() } });
  try {
    const panel = open(t);
    panel.querySelector('[data-start]').click();
    assert.match(panel.querySelector('[data-status]').textContent, /至少选择/);
    panel.querySelector('textarea').value = 'https://other.chaoxing.com/mooc-ans/work/selectWorkQuestionYiPiYue';
    panel.querySelector('[data-start]').click();
    assert.match(panel.querySelector('[data-status]').textContent, /当前学习通站点/);
    assert.equal(t.loaded.length, 0);
    panel.querySelector('textarea').value = '/mooc-ans/work/selectWorkQuestionYiPiYue\n/mooc-ans/work/selectWorkQuestionYiPiYue';
    panel.querySelector('[data-start]').click();
    await until(() => t.saved.length);
    assert.equal(t.loaded.length, 1);
  } finally { t.dom.window.close(); }
});

test('空题目拒绝生成空 DOCX', async () => {
  const t = setup({ html: '<div class="ceyan_name"><h3>空试卷</h3></div>', url: 'https://mooc1.chaoxing.com/mooc-ans/work/selectWorkQuestionYiPiYue' });
  try {
    const button = [...t.w.document.querySelectorAll('button')].find(el => el.innerText?.includes('双击'));
    button.dispatchEvent(new t.w.Event('dblclick'));
    await until(() => t.alerts.length);
    assert.match(t.alerts[0], /未找到可导出的题目/);
    assert.equal(t.saved.length, 0);
  } finally { t.dom.window.close(); }
});

test('后台工作页不创建单份或批量按钮', () => {
  const t = setup({ html: quiz(), url: 'https://mooc1.chaoxing.com/mooc-ans/work/selectWorkQuestionYiPiYue?cx_word_worker=1' });
  try { assert.equal(t.w.document.querySelectorAll('button').length, 0); }
  finally { t.dom.window.close(); }
});

test('某一份超时后继续导出下一份，ZIP 清单记录失败', async () => {
  const t = setup({ html: `<iframe id="iframe" src="/mooc-ans/knowledge/cards"></iframe><ul>${chapter(1, '超时测试')}${chapter(2, '成功测试')}</ul>`, reviews: { 2: quiz() } });
  try {
    let time = Date.now();
    t.w.Date.now = () => (time += 13000);
    const panel = open(t);
    panel.querySelector('[data-start]').click();
    await until(() => t.saved.length);
    assert.deepEqual(t.loaded, ['1', '2']);
    assert.equal(t.removed.length, 2);
    const archive = await JSZip.loadAsync(await t.saved[0].blob.arrayBuffer());
    assert.ok(archive.file('002_专题六.docx'));
    const log = await archive.file('导出清单.txt').async('string');
    assert.match(log, /成功 1，失败 1/);
    assert.match(log, /超时测试.*超时/);
    assert.equal(panel.querySelector('[data-start]').disabled, false);
  } finally { t.dom.window.close(); }
});

test('所有项目失败时不下载空 ZIP，显示失败原因并允许重试', async () => {
  const t = setup({ html: `<iframe id="iframe" src="/mooc-ans/knowledge/cards"></iframe><ul>${chapter(1, '超时测试')}</ul>` });
  try {
    let time = Date.now();
    t.w.Date.now = () => (time += 13000);
    const panel = open(t);
    panel.querySelector('[data-start]').click();
    await until(() => panel.querySelector('[data-status]').textContent.includes('未生成文件'));
    assert.equal(t.saved.length, 0);
    assert.match(panel.querySelector('[data-status]').textContent, /成功 0，失败 1/);
    assert.equal(t.removed.length, 1);
    assert.equal(panel.querySelector('[data-start]').disabled, false);
  } finally { t.dom.window.close(); }
});

test('真实页面的部分正确状态和填空答案可保留', async () => {
  const html = quiz().replace('marking_dui', 'marking_bandui') + `<div class="TiMu"><div class="Zy_TItle"><i>41</i><div class="qtContent"><span class="newZy_TItle">【填空题】</span>填空题干</div></div>
  <div class="myAllAnswerBx"><div class="myAnswerBx"><div class="myAnswer">第一空：<p>填空答案</p></div></div></div></div>`;
  const t = setup({ html, url: 'https://mooc1.chaoxing.com/mooc-ans/work/selectWorkQuestionYiPiYue' });
  try {
    const button = [...t.w.document.querySelectorAll('button')].find(el => el.innerText?.includes('双击'));
    button.dispatchEvent(new t.w.Event('dblclick'));
    await until(() => t.saved.length);
    const doc = await JSZip.loadAsync(await t.saved[0].blob.arrayBuffer());
    const xml = await doc.file('word/document.xml').async('string');
    assert.match(xml, /答案状态：部分正确/);
    assert.match(xml, /我的答案：第一空：填空答案/);
  } finally { t.dom.window.close(); }
});
