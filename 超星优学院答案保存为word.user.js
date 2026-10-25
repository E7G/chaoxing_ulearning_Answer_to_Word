// ==UserScript==
// @name         超星优学院答案保存为word
// @namespace    http://tampermonkey.net/
// @version      0.2.1
// @description  Extract text from specific elements, modify it, and save as a DOCX file
// @author       e7g
// @match       	 *://*.chaoxing.com/*work*view*
// @match       	 *://*.chaoxing.com/*exam*
// @match       	 *://*.chaoxing.com/*selectWorkQuestionYiPiYue*
// @match         *://*.chaoxing.com/mycourse/studentstudy*
// @match         *://*.chaoxing.com/mooc-ans/mycourse/studentstudy*
// @match         *://*.chaoxing.com/*work/list*
// @match       	 *://homework.ulearning.cn/*
// @match       	 *://changjiang-exam.yuketang.cn/result/*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// ==/UserScript==

(function () {
    'use strict';

    // 新增站点识别函数
    function getSiteType() {
        const url = window.location.href;
        if (window.location.host.includes('chaoxing.com')) {
            // 适配新发现的测验页面路径 /mycourse/studentstudy
            if (url.includes('selectWorkQuestionYiPiYue')) {
                return 'chaoxing_quiz';
            }
            return 'chaoxing';
        }
        if (url.includes('ulearning.cn')) return 'ulearning';
        if (url.includes('changjiang-exam.yuketang.cn')) return 'changjiang_yuketang';
        return 'unknown';
    }

    // const titleElement = document.getElementsByClassName("mark_title")[0];//||document.getElementsByClassName("ceyan_name")[0].children[0]
    const currentSite = getSiteType();

    // 站点标题选择器配置 - 消除嵌套条件
    const siteTitleSelectors = {
        'chaoxing': '.mark_title',
        'chaoxing_quiz': '.ceyan_name h1, .ceyan_name h2, .ceyan_name h3, .ceyan_name h4, .ceyan_name h5, .ceyan_name h6',
        'changjiang_yuketang': '.header-title',
        'ulearning': '.ul-page__header h1, .ul-page__header h2, .ul-page__header h3, .ul-page__header h4, .ul-page__header h5, .ul-page__header h6'
    };

    // 获取标题元素 - 一行解决，无嵌套
    const titleElement = document.querySelector(siteTitleSelectors[currentSite]);
    // console.log("currentSite:", currentSite, "titleElement:", titleElement.textContent);
    // 批量窗口只由最外层页面创建；后台加载页不创建按钮。
    function isBatchWorker() {
        let frame = window;
        while (true) {
            try {
                if (new URL(frame.location.href).searchParams.has('cx_word_worker')) return true;
                if (frame === frame.parent) return false;
                frame = frame.parent;
            } catch { return false; }
        }
    }
    if (isBatchWorker()) return;
    if (currentSite.startsWith('chaoxing') && window === window.top) mountBatchExport();
    if (!titleElement) return;
    // 创建一个浮动的可拖动按钮
    const button = document.createElement('button');
    button.innerText = `双击保存答案为word（${currentSite}）`; // 在按钮文字中显示当前站点
    button.style.position = 'fixed';
    button.style.top = '10px';
    button.style.right = '10px';
    button.style.zIndex = 10000;
    document.body.appendChild(button);

    let isDragging = false;
    let startX, startY, initialX, initialY;
    let dragThreshold = 5; // 定义拖动阈值，单位为像素

    button.addEventListener('mousedown', (e) => {
        isDragging = false;
        startX = e.clientX;
        startY = e.clientY;
        initialX = button.offsetLeft;
        initialY = button.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
        if (startX !== undefined && startY !== undefined) {
            const dx = Math.abs(e.clientX - startX);
            const dy = Math.abs(e.clientY - startY);
            if (dx > dragThreshold || dy > dragThreshold) {
                isDragging = true;
            }
        }
        if (isDragging) {
            e.preventDefault();
            const x = initialX + (e.clientX - startX);
            const y = initialY + (e.clientY - startY);
            button.style.left = x + 'px';
            button.style.top = y + 'px';
            button.style.right = 'auto'; // 清除右侧定位
        }
    });

    document.addEventListener('mouseup', () => {
        const wasDragging = isDragging;
        isDragging = false;
        startX = undefined;
        startY = undefined;
        if (wasDragging) {
            return;
        }
    });

    // ulearning答案提取函数 - 消除嵌套
function extractUlearningAnswer(element) {
    // 多选题处理
    if (element.querySelector('.choice-item')) {
        return extractMultipleChoice(element);
    }

    // 判断题处理
    return extractTrueFalse(element);
}

function extractMultipleChoice(element) {
    const options = Array.from(element.querySelectorAll('.choice-item')).map(item => {
        const index = item.querySelector('.index').textContent.trim().replace('.', '');
        const text = item.querySelector('.choice-title').textContent.trim();
        return `${index}.${text}`;
    });

    const selected = [...new Set(
        Array.from(element.querySelectorAll('.is-checked')).map(item =>
            item.closest('.choice-item').querySelector('.index').textContent.trim().replace('.', '')
        )
    )];

    return `我的答案：${selected.join(',')}`;
}

function extractTrueFalse(element) {
    const iconMap = { 'icon-zhengque': '对', 'icon-cuowu1': '错' };

    const options = Array.from(element.querySelectorAll('.ul-radio__label')).map(label => {
        return Array.from(label.childNodes).map(node => {
            if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('iconfont')) {
                return iconMap[Array.from(node.classList).find(c => c in iconMap)] || '';
            }
            return node.nodeType === Node.TEXT_NODE ? node.textContent.trim() : '';
        }).join('').replace(/\s+/g, ' ');
    }).filter(text => text);

    const selectedNode = element.querySelector('.is-checked .ul-radio__label i');
    const selected = selectedNode ? iconMap[Array.from(selectedNode.classList).find(c => c in iconMap)] : '未知';

    return `我的答案：${selected}`;
}

button.addEventListener('dblclick', async function (e) {
        if (isDragging) {
            e.stopPropagation();
            e.preventDefault();
            return;
        }

        button.disabled = true;
        try {
            const result = await exportDocument(document, currentSite);
            saveAs(result.blob, safeFileName(result.title) + '.docx');
        } catch (error) {
            alert('导出失败：' + error.message);
        } finally {
            button.disabled = false;
        }
    });

    function safeFileName(name) {
        return (name || '未命名').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/g, '').slice(0, 100) || '未命名';
    }

    function discoverBatchItems() {
        const items = new Map();
        const cardFrame = document.querySelector('iframe#iframe');
        if (cardFrame?.getAttribute('src')) {
            for (const node of document.querySelectorAll('.posCatalog_select[id^="cur"]')) {
                const name = node.querySelector('.posCatalog_name');
                if (!name || !/测试|测验|习题|作业/.test(name.textContent)) continue;
                // 仅处理已完成的测试，避免进入未作答页面。
                if (!node.querySelector('.icon_Completed')) continue;
                const id = node.id.replace(/^cur/, '');
                if (!/^\d+$/.test(id)) continue;
                const url = new URL(cardFrame.getAttribute('src'), location.href);
                url.searchParams.set('knowledgeid', id);
                url.searchParams.set('num', '0');
                const section = node.closest('.posCatalog_level')?.parentElement.querySelector('.posCatalog_title');
                items.set(url.href, { url: url.href, title: [section?.textContent.trim(), name.textContent.trim()].filter(Boolean).join(' / ') });
            }
        }
        for (const link of document.querySelectorAll('a[href]')) {
            try {
                const url = validateReviewUrl(link.href);
                items.set(url, { url, title: link.textContent.trim() || '作业' });
            } catch { /* 非答案详情链接 */ }
        }
        return [...items.values()];
    }

    function validateReviewUrl(value) {
        const url = new URL(value, location.href);
        if (url.origin !== location.origin || !/^https?:$/.test(url.protocol) ||
            !/selectWorkQuestionYiPiYue|\/work\/view|\/exam[^/]*\/.*(?:look|view)/i.test(url.pathname)) {
            throw new Error('仅支持当前学习通站点的已批阅答案详情链接');
        }
        url.hash = '';
        return url.href;
    }

    function mountBatchExport() {
        const launcher = document.createElement('button');
        launcher.textContent = '批量导出 Word';
        launcher.id = 'cx-word-batch-open';
        launcher.style.cssText = 'position:fixed;right:16px;top:48px;z-index:10001;padding:8px 14px;cursor:grab;touch-action:none;user-select:none';
        launcher.title = '点击打开批量导出，按住拖动调整位置';
        document.body.appendChild(launcher);
        makeDraggable(launcher);
        launcher.addEventListener('click', () => {
            if (document.getElementById('cx-word-batch-panel')) return;
            const panel = document.createElement('section');
            panel.id = 'cx-word-batch-panel';
            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-label', '批量导出 Word');
            panel.style.cssText = 'position:fixed;right:16px;top:88px;width:min(460px,90vw);max-height:75vh;overflow:auto;background:white;color:#222;border:1px solid #aaa;border-radius:8px;padding:16px;z-index:10002;box-shadow:0 4px 24px #0003;font:14px/1.6 sans-serif';
            panel.innerHTML = '<strong>批量导出 Word</strong><p>自动列出已完成的章节测试。每份生成 DOCX，合并下载为 ZIP。</p>' +
                '<div data-list></div><label>补充已批阅答案链接（每行一个、与当前页面同站点）<textarea data-urls rows="3" style="display:block;width:100%;box-sizing:border-box"></textarea></label>' +
                '<p><button data-all>全选</button> <button data-none>全不选</button> <button data-start>开始导出</button> <button data-cancel disabled>取消</button> <button data-close>关闭</button></p>' +
                '<p data-status role="status" aria-live="polite">请选择需要导出的内容。</p><div data-results></div>';
            const items = discoverBatchItems();
            const list = panel.querySelector('[data-list]');
            items.forEach((item, index) => {
                const label = document.createElement('label');
                label.style.display = 'block';
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = true;
                input.dataset.index = index;
                label.append(input, document.createTextNode(' ' + item.title));
                list.appendChild(label);
            });
            if (!items.length) list.textContent = '未发现已完成测试，可在下方粘贴答案详情链接。';
            document.body.appendChild(panel);
            const start = panel.querySelector('[data-start]');
            const cancel = panel.querySelector('[data-cancel]');
            const status = panel.querySelector('[data-status]');
            const results = panel.querySelector('[data-results]');
            let controller;
            let busy = false;
            panel.querySelector('[data-all]').onclick = () => list.querySelectorAll('input').forEach(input => { input.checked = true; });
            panel.querySelector('[data-none]').onclick = () => list.querySelectorAll('input').forEach(input => { input.checked = false; });
            panel.querySelector('[data-close]').onclick = () => { if (!busy) panel.remove(); };
            cancel.onclick = () => controller?.abort();
            start.onclick = async () => {
                if (busy) return;
                const selected = [...list.querySelectorAll('input:checked')].map(input => items[Number(input.dataset.index)]);
                try {
                    for (const line of panel.querySelector('[data-urls]').value.split(/\r?\n/).map(s => s.trim()).filter(Boolean)) {
                        const url = validateReviewUrl(line);
                        selected.push({ url, title: '补充作业' });
                    }
                } catch (error) { status.textContent = error.message; return; }
                const queue = [...new Map(selected.map(item => [item.url, item])).values()];
                if (!queue.length) { status.textContent = '请至少选择一份测试或填写一个答案详情链接。'; return; }
                busy = true;
                controller = new AbortController();
                panel.querySelectorAll('input, textarea, button').forEach(control => { control.disabled = true; });
                cancel.disabled = false;
                results.replaceChildren();
                try {
                    await runBatchExport(queue, controller.signal, message => { status.textContent = message; }, message => {
                        const line = document.createElement('p');
                        line.textContent = message;
                        results.appendChild(line);
                    });
                } catch (error) { status.textContent = '批量导出失败：' + error.message; }
                finally {
                    busy = false;
                    panel.querySelectorAll('input, textarea, button').forEach(control => { control.disabled = false; });
                    cancel.disabled = true;
                }
            };
        });
    }

    function makeDraggable(element) {
        let drag;
        let suppressClick = false;
        const moveWithinViewport = (left, top, width, height) => {
            element.style.left = Math.max(0, Math.min(left, window.innerWidth - width)) + 'px';
            element.style.top = Math.max(0, Math.min(top, window.innerHeight - height)) + 'px';
            element.style.right = 'auto';
        };
        element.addEventListener('pointerdown', event => {
            if (event.button !== 0 || event.isPrimary === false) return;
            const rect = element.getBoundingClientRect();
            suppressClick = false;
            drag = { id: event.pointerId, x: event.clientX, y: event.clientY, rect, moved: false };
            element.setPointerCapture?.(event.pointerId);
        });
        document.addEventListener('pointermove', event => {
            if (!drag || event.pointerId !== drag.id) return;
            const dx = event.clientX - drag.x;
            const dy = event.clientY - drag.y;
            if (!drag.moved && Math.hypot(dx, dy) <= 5) return;
            drag.moved = true;
            suppressClick = true;
            element.style.cursor = 'grabbing';
            event.preventDefault();
            moveWithinViewport(drag.rect.left + dx, drag.rect.top + dy, drag.rect.width, drag.rect.height);
        });
        const finish = event => {
            if (!drag || event.pointerId !== drag.id) return;
            if (element.hasPointerCapture?.(event.pointerId)) element.releasePointerCapture(event.pointerId);
            drag = undefined;
            element.style.cursor = 'grab';
        };
        document.addEventListener('pointerup', finish);
        document.addEventListener('pointercancel', finish);
        element.addEventListener('lostpointercapture', finish);
        element.addEventListener('click', event => {
            if (!suppressClick || event.detail === 0) return;
            suppressClick = false;
            event.preventDefault();
            event.stopImmediatePropagation();
        });
        window.addEventListener('resize', () => {
            if (!element.style.left) return;
            const rect = element.getBoundingClientRect();
            moveWithinViewport(rect.left, rect.top, rect.width, rect.height);
        });
    }

    function findReviewDocument(root, seen = new Set()) {
        if (!root || seen.has(root)) return null;
        seen.add(root);
        if (/selectWorkQuestionYiPiYue/.test(root.URL) && root.querySelector('.TiMu')) {
            return { document: root, site: 'chaoxing_quiz' };
        }
        if (root.querySelector('.mark_title') && root.querySelector('.aiAreaContent') &&
            root.querySelector('.mark_answer, .colorGreen')) return { document: root, site: 'chaoxing' };
        for (const frame of root.querySelectorAll('iframe')) {
            try {
                const result = findReviewDocument(frame.contentDocument, seen);
                if (result) return result;
            } catch { /* 跨域框架不可读取 */ }
        }
        return null;
    }

    async function loadReviewDocument(url, signal, useDocument, timeoutMs = 25000) {
        const frame = document.createElement('iframe');
        frame.setAttribute('aria-hidden', 'true');
        frame.style.cssText = 'position:fixed;left:-12000px;top:0;width:1100px;height:800px;visibility:hidden';
        const target = new URL(url, location.href);
        if (target.origin !== location.origin) throw new Error('无法读取跨站点答案');
        target.searchParams.set('cx_word_worker', '1');
        frame.src = target.href;
        try {
            signal.throwIfAborted();
            document.body.appendChild(frame);
            const review = await new Promise((resolve, reject) => {
                const started = Date.now();
                const cleanup = () => { clearInterval(timer); signal.removeEventListener('abort', abort); };
                const abort = () => { cleanup(); reject(new DOMException('已取消', 'AbortError')); };
                const timer = setInterval(() => {
                    let result;
                    try { result = findReviewDocument(frame.contentDocument); } catch { /* 等待导航完成 */ }
                    if (result && result.document.readyState === 'complete') { cleanup(); resolve(result); }
                    else if (Date.now() - started >= timeoutMs) { cleanup(); reject(new Error('等待已批阅页面超时：可能未批阅、登录失效或页面不支持')); }
                }, 250);
                signal.addEventListener('abort', abort, { once: true });
                if (signal.aborted) abort();
            });
            // 在移除 iframe 前完成提取和图片读取。
            return await useDocument(review);
        } finally { frame.remove(); }
    }

    async function runBatchExport(queue, signal, update, report) {
        const zip = new window.JSZip();
        const log = [];
        let succeeded = 0;
        let failed = 0;
        for (let index = 0; index < queue.length; index++) {
            if (signal.aborted) break;
            const item = queue[index];
            update(`正在导出 ${index + 1}/${queue.length}：${item.title}`);
            try {
                const result = await loadReviewDocument(item.url, signal,
                    review => exportDocument(review.document, review.site, signal));
                signal.throwIfAborted();
                const name = `${String(index + 1).padStart(3, '0')}_${safeFileName(result.title)}.docx`;
                zip.file(name, await result.blob.arrayBuffer());
                succeeded++;
                const message = `成功：${name}（${result.questionCount} 题）`;
                log.push(message);
                report(message);
            } catch (error) {
                if (signal.aborted) break;
                failed++;
                const message = `失败：${item.title} — ${error.message}`;
                log.push(message);
                report(message);
            }
        }
        const summary = `${signal.aborted ? '已取消' : '已完成'}：成功 ${succeeded}，失败 ${failed}，未处理 ${queue.length - succeeded - failed}。`;
        if (succeeded) {
            update('正在打包 ZIP…');
            zip.file('导出清单.txt', '\uFEFF' + [summary, ...log].join('\r\n'));
            const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
            saveAs(blob, `学习通批量导出_${new Date().toISOString().slice(0, 10)}.zip`);
        }
        update(summary + (succeeded ? ' ZIP 已生成。' : ' 未生成文件。'));
    }

    async function exportDocument(sourceDocument, currentSite, signal) {
        const titleElement = sourceDocument.querySelector(siteTitleSelectors[currentSite]);
        // 站点内容元素选择器配置 - 消除条件嵌套
        const siteContentSelectors = {
            'chaoxing': '.aiAreaContent',
            'chaoxing_quiz': '.TiMu',
            'changjiang_yuketang': '.subject-item:not(.subject-item.primary)',
            'ulearning': '.question-item'
        };

        // 获取内容元素 - 一行解决
        // 所有预处理都在副本上完成，避免改变原页面答案。
        const contentElements = Array.from(sourceDocument.querySelectorAll(siteContentSelectors[currentSite]), element => element.cloneNode(true));
        if (!contentElements.length) throw new Error('未找到可导出的题目');
        const paragraphs = [];

        // 站点处理策略 - 消除所有if-else分支
        const siteProcessors = {
            'chaoxing': (element) => {
                // 处理colorShallow元素
                const colorShallowElement = element.querySelector('.colorShallow');
                if (colorShallowElement) {
                    const match = colorShallowElement.textContent.match(/..题/g);
                    if (match) {
                        colorShallowElement.textContent = `【${match[0]}】`;
                    }
                }

                // 同步正确答案
                const colorGreenElement = element.querySelector('.colorGreen');
                const markAnswerElement = element.querySelector('.mark_answer');
                if (colorGreenElement && markAnswerElement) {
                    markAnswerElement.textContent = colorGreenElement.textContent;
                }
            },

            'chaoxing_quiz': (element) => {
                const titleElement = element.querySelector('.newZy_TItle');
                const questionNumElement = element.querySelector('.Zy_TItle i');
                
                if (titleElement) {
                    element.setAttribute('data-question-type', titleElement.textContent.trim());
                }
                
                if (questionNumElement) {
                    element.setAttribute('data-question-number', questionNumElement.textContent.trim());
                }
                
                const questionContentElement = element.querySelector('.qtContent');
                if (questionContentElement) {
                    const questionText = questionContentElement.textContent.replace(/【.+?】/, '').trim();
                    element.setAttribute('data-question-text', questionText);
                }
                
                const optionElements = element.querySelectorAll('.Zy_ulTop li');
                if (optionElements.length > 0) {
                    const options = Array.from(optionElements).map(li => {
                        const optionLabel = li.querySelector('i')?.textContent.trim() || '';
                        let optionText = '';
                        const aElement = li.querySelector('a');
                        if (aElement) {
                            optionText = aElement.textContent.trim();
                        }
                        if (!optionText) {
                            const pElement = li.querySelector('p');
                            if (pElement) {
                                optionText = pElement.textContent.trim();
                            }
                        }
                        if (!optionText) {
                            optionText = li.textContent.replace(optionLabel, '').trim();
                        }
                        return `${optionLabel} ${optionText}`;
                    });
                    element.setAttribute('data-all-options', options.join('\n'));
                }
                
                const userAnswerElement = element.querySelector('.myAnswerBx .answerCon');
                if (userAnswerElement) {
                    const userAnswer = userAnswerElement.textContent.trim();
                    element.setAttribute('data-user-answer', userAnswer);
                }
                
                if (!element.hasAttribute('data-user-answer')) {
                    const fillBlankUserAnswers = element.querySelectorAll('.myAllAnswerBx .myAnswerBx .myAnswer');
                    if (fillBlankUserAnswers.length > 0) {
                        const userAnswers = Array.from(fillBlankUserAnswers).map(el => {
                            return el.textContent.replace(/^第?\d*空[：:\s]*/, '').trim();
                        }).filter(a => a);
                        element.setAttribute('data-user-answer', userAnswers.join('；'));
                    }
                }
                
                const scoreElement = element.querySelector('.scoreNum');
                if (scoreElement) {
                    const score = scoreElement.textContent.trim();
                    element.setAttribute('data-score', score);
                }
                
                const correctOrNotElement = element.querySelector('.CorrectOrNot');
                if (correctOrNotElement) {
                    const correct = element.querySelector('.CorrectOrNot .marking_dui');
                    const wrong = element.querySelector('.CorrectOrNot .marking_cuo');
                    const partial = element.querySelector('.CorrectOrNot .marking_bandui');
                    if (partial || (correct && wrong)) element.setAttribute('data-is-correct', '部分正确');
                    else if (correct || wrong) element.setAttribute('data-is-correct', correct ? '正确' : '错误');
                }
                
                const correctAnswerElement = element.querySelector('.correctAnswerBx .correctAnswer .answerCon');
                if (correctAnswerElement) {
                    const correctAnswer = correctAnswerElement.textContent.trim();
                    element.setAttribute('data-correct-answer', correctAnswer);
                }
                
                if (!element.hasAttribute('data-correct-answer')) {
                    const fillBlankCorrectAnswers = element.querySelectorAll('.correctAnswerBx .correctAnswer.marTop16');
                    if (fillBlankCorrectAnswers.length > 0) {
                        const correctAnswers = Array.from(fillBlankCorrectAnswers).map(el => {
                            return el.textContent.replace(/^第?\d*空[：:\s]*/, '').trim();
                        }).filter(a => a);
                        element.setAttribute('data-correct-answer', correctAnswers.join('；'));
                    }
                }
                
                const answerAnalysisElement = element.querySelector('.answerKeyBx .answerCon');
                if (answerAnalysisElement) {
                    const analysis = answerAnalysisElement.textContent.trim();
                    if (analysis) {
                        element.setAttribute('data-answer-analysis', analysis);
                    }
                }
            },

            'changjiang_yuketang': (element) => {
                // 长江雨课堂的答案提取逻辑 - 提取选项、图片和正确答案
                const selectedOption = element.querySelector('.el-radio.is-checked');
                const allOptions = element.querySelectorAll('.el-radio');
                const titleElement = element.querySelector('.item-body h4, .exam-font');
                const imgElement = titleElement?.querySelector('img');
                const itemTypeElement = element.querySelector('.item-type');
                const correctAnswerElement = element.querySelector('.item-footer--header span:last-child');
                
                // 提取题号信息
                if (itemTypeElement) {
                    const itemTypeText = itemTypeElement.textContent.trim();
                    element.setAttribute('data-item-type', itemTypeText);
                }
                
                // 提取图片信息（用于后续嵌入）
                if (imgElement) {
                    const imgSrc = imgElement.getAttribute('src');
                    const imgAlt = imgElement.getAttribute('alt') || '题目图片';
                    if (imgSrc) {
                        // 只存储图片源和alt，不再存储冗余的文本信息
                        element.setAttribute('data-image-src', imgSrc);
                        element.setAttribute('data-image-alt', imgAlt);
                    }
                }
                
                if (selectedOption) {
                    // 获取显示的选项标识（不是value，而是显示的A/B/C/D）
                    const displayLabel = selectedOption.querySelector('.radioInput')?.textContent?.trim();
                    // 获取选项文本
                    const optionText = selectedOption.querySelector('.radioText')?.textContent?.trim();
                    
                    if (displayLabel && optionText) {
                        element.setAttribute('data-selected-option', `${displayLabel}. ${optionText}`);
                    }
                }
                
                // 提取正确答案
                if (correctAnswerElement) {
                    const correctAnswer = correctAnswerElement.textContent.trim();
                    element.setAttribute('data-correct-answer', correctAnswer);
                }
                
                // 提取所有选项
                if (allOptions.length > 0) {
                    const optionList = Array.from(allOptions).map((opt) => {
                        const displayLabel = opt.querySelector('.radioInput')?.textContent?.trim();
                        const text = opt.querySelector('.radioText')?.textContent?.trim() || '';
                        return `${displayLabel}. ${text}`;
                    });
                    element.setAttribute('data-all-options', optionList.join('\n'));
                }
            },

            'ulearning': (element) => {
                // ulearning答案提取逻辑
                const answerElement = element.querySelector(".choice-list, .answer-area");
                if (answerElement) {
                    const answerInfo = extractUlearningAnswer(answerElement);
                    element.setAttribute('data-answer-info', answerInfo);
                }
            }
        };
        // 内容收集策略 - 消除剩余的条件分支
        const contentCollectors = {
            'chaoxing': (element) => [element.textContent.trim()],
            'chaoxing_quiz': (element) => {
                const parts = [];
                
                const questionType = element.getAttribute('data-question-type');
                const questionNumber = element.getAttribute('data-question-number');
                const questionText = element.getAttribute('data-question-text');
                const allOptions = element.getAttribute('data-all-options');
                const userAnswer = element.getAttribute('data-user-answer');
                const correctAnswer = element.getAttribute('data-correct-answer');
                const score = element.getAttribute('data-score');
                const isCorrect = element.getAttribute('data-is-correct');
                
                if (questionNumber && questionType) {
                    parts.push(`${questionNumber} ${questionType}`);
                } else if (questionType) {
                    parts.push(questionType);
                }
                
                if (questionText) {
                    parts.push(questionText);
                }
                
                if (allOptions) {
                    parts.push('');
                    parts.push('选项：');
                    parts.push(allOptions);
                }
                
                if (userAnswer) {
                    parts.push('');
                    parts.push(`我的答案：${userAnswer}`);
                }
                
                if (isCorrect) {
                    parts.push(`答案状态：${isCorrect}`);
                }
                
                if (correctAnswer) {
                    parts.push(`正确答案：${correctAnswer}`);
                }
                
                if (score) {
                    parts.push(`得分：${score}分`);
                }
                
                const answerAnalysis = element.getAttribute('data-answer-analysis');
                if (answerAnalysis) {
                    parts.push(`答案解析：${answerAnalysis}`);
                }
                
                return parts;
            },
            'changjiang_yuketang': (element) => {
                const parts = [];
                const selectedOption = element.getAttribute('data-selected-option');
                const correctAnswer = element.getAttribute('data-correct-answer');
                const allOptions = element.getAttribute('data-all-options');
                const itemType = element.getAttribute('data-item-type');
                
                if (itemType) {
                    parts.push(itemType);
                }
                
                // 添加题目内容（处理图片，在图片位置插入占位符）
                const titleElement = element.querySelector('.item-body h4, .exam-font');
                if (titleElement) {
                    // 克隆元素避免修改原始DOM
                    const titleClone = titleElement.cloneNode(true);
                    const imgElement = titleClone.querySelector('img');
                    
                    if (imgElement) {
                        // 在图片位置插入占位符，保留图片alt文本
                        const imgAlt = imgElement.getAttribute('alt') || '题目图片';
                        imgElement.replaceWith(`[IMAGE:${imgAlt}]`);
                    }
                    
                    let titleText = titleClone.textContent.trim();
                    // 清理多余的空白字符
                    titleText = titleText.replace(/\s+/g, ' ').trim();
                    parts.push(titleText);
                } else {
                    parts.push(element.textContent.trim());
                }
                
                if (allOptions) {
                    parts.push('');
                    parts.push('选项：');
                    parts.push(allOptions);
                }
                
                if (selectedOption) {
                    parts.push('');
                    parts.push(`我的答案：${selectedOption}`);
                }
                
                if (correctAnswer) {
                    parts.push(`正确答案：${correctAnswer}`);
                }
                
                return parts;
            },
            'ulearning': (element) => {
                const parts = [];
                
                // 提取题目内容
                const questionText = element.textContent.trim();
                if (questionText) {
                    parts.push(questionText);
                }
                
                // 提取答案信息
                const answerInfo = element.getAttribute('data-answer-info');
                if (answerInfo) {
                    parts.push('');
                    parts.push(answerInfo);
                }
                
                return parts;
            }
        };

        // 收集内容 - 下载图片并转换为base64
        const images = []; // 存储图片base64数据和位置信息
        
        // 同步处理内容收集，记录准确的图片位置
        for (let i = 0; i < contentElements.length; i++) {
            const contentElement = contentElements[i];

            // 执行站点特定的处理逻辑
            const processor = siteProcessors[currentSite];
            if (processor) {
                processor(contentElement);
            }

            // 收集内容 - 一行解决
            const collector = contentCollectors[currentSite];
            if (collector) {
                const contentParts = collector(contentElement);
                
                // 在内容中查找图片占位符，记录准确位置
                contentParts.forEach((part, partIndex) => {
                    const imageMatch = part.match(/\[IMAGE:([^\]]+)\]/);
                    if (imageMatch) {
                        const imgAlt = imageMatch[1];
                        const imgSrc = contentElement.getAttribute('data-image-src');
                        if (imgSrc) {
                            // 计算这个图片在当前段落中的准确位置
                        images.push({
                            url: imgSrc,
                            index: paragraphs.length + partIndex, // 图片所在段落位置
                            alt: imgAlt,
                            partIndex: partIndex, // 在段落中的位置
                            originalSrc: imgSrc // 保存原始图片src信息
                        });
                        }
                    }
                });
                
                paragraphs.push(...contentParts);
            }
            paragraphs.push(''); // 段落间隔
        }

        // 下载所有图片并转换为base64
        const validImages = [];
        for (let i = 0; i < images.length; i++) {
            try {
                signal?.throwIfAborted();
                const base64Data = await downloadImage(new URL(images[i].url, sourceDocument.baseURI).href);
                if (base64Data) {
                    validImages.push({
                        data: base64Data,
                        index: images[i].index,
                        alt: images[i].alt,
                        originalSrc: images[i].originalSrc // 传递原始src信息
                    });
                }
            } catch (error) {
                console.error('图片下载失败:', error);
            }
        }

        // Function to create a simple DOCX file with base64 encoded images
        async function createDocx(paragraphs, images) {
            const JSZip = window.JSZip;
            const zip = new JSZip();

            // Create the [Content_Types].xml file
            const contentTypesXml = `
                <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                    <Default Extension="xml" ContentType="application/xml"/>
                    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
                    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
                </Types>
            `;
            zip.file('[Content_Types].xml', contentTypesXml);

            // Create the _rels/.rels file
            const relsXml = `
                <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
                </Relationships>
            `;
            zip.folder('_rels').file('.rels', relsXml);

            // Create the word/_rels/document.xml.rels file for image relationships
            let imageRelsXml = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
            for (let i = 0; i < images.length; i++) {
                const imageData = images[i].data;
                
                // 从data URL中提取文件扩展名
                let extension = 'png'; // 默认扩展名
                if (imageData.includes('data:image/')) {
                    const match = imageData.match(/data:image\/(\w+);base64,(.*)/);
                    if (match) {
                        extension = match[1];
                    }
                }
                
                const imageName = `image${i + 1}.${extension}`;
                imageRelsXml += `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageName}"/>`;
            }
            imageRelsXml += '</Relationships>';
            zip.folder('word').folder('_rels').file('document.xml.rels', imageRelsXml);

            // 构建包含base64图片的文档内容
            let documentContent = '';
            let imageIndex = 0;
            
            // 为每张图片创建关系ID和图像文件
            const imageRels = [];
            for (let i = 0; i < images.length; i++) {
                const imageData = images[i].data;
                
                // 从data URL中提取文件扩展名 - 消除特殊情况
                let extension = 'png'; // 默认扩展名
                let base64Data = imageData;
                
                // 如果包含data URL前缀，提取扩展名和纯base64数据
                if (imageData.includes('data:image/')) {
                    const match = imageData.match(/data:image\/(\w+);base64,(.*)/);
                    if (match) {
                        extension = match[1];
                        base64Data = match[2];
                    }
                }
                
                const imageName = `image${i + 1}.${extension}`;
                const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                
                // 添加图片文件到zip
                zip.folder('word').folder('media').file(imageName, imageBuffer);
                
                // 记录关系
                imageRels.push({
                    id: `rId${i + 1}`,
                    target: `media/${imageName}`
                });
            }
            
            for (let i = 0; i < paragraphs.length; i++) {
                const text = paragraphs[i];
                
                // 检查是否有图片需要插入到当前段落
                const imagesInThisParagraph = images.filter(img => img.index === i);
                
                if (imagesInThisParagraph.length > 0) {
                    // 处理包含图片占位符的段落
                    let processedText = text;
                    
                    imagesInThisParagraph.forEach((image, imgOrder) => {
                        // 替换占位符为真实图片
                        const placeholder = `[IMAGE:${image.alt}]`;
                        const relId = `rId${imageIndex + 1}`;
                        
                        // 分割文本，在图片位置插入图片
                        const parts = processedText.split(placeholder);
                        
                        if (parts[0].trim()) {
                            documentContent += `<w:p><w:r><w:t>${escapeXml(parts[0])}</w:t></w:r></w:p>`;
                        }
                        
                        // 添加图片，包含原始src信息
                        documentContent += `
                            <w:p>
                                <w:r>
                                    <w:drawing>
                                        <wp:inline distT="0" distB="0" distL="0" distR="0">
                                            <wp:extent cx="3000000" cy="2250000"/>
                                            <wp:docPr id="${imageIndex + 1}" name="${escapeXml(image.alt)}" descr="原始图片地址: ${escapeXml(image.originalSrc || '未知')}"/>
                                            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                                                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                                                    <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                                                        <pic:nvPicPr>
                                                            <pic:cNvPr id="${imageIndex + 1}" name="${escapeXml(image.alt)}" descr="原始图片地址: ${escapeXml(image.originalSrc || '未知')}"/>
                                                            <pic:cNvPicPr/>
                                                        </pic:nvPicPr>
                                                        <pic:blipFill>
                                                            <a:blip r:embed="${relId}"/>
                                                            <a:stretch>
                                                                <a:fillRect/>
                                                            </a:stretch>
                                                        </pic:blipFill>
                                                        <pic:spPr>
                                                            <a:xfrm>
                                                                <a:off x="0" y="0"/>
                                                                <a:ext cx="3000000" cy="2250000"/>
                                                            </a:xfrm>
                                                            <a:prstGeom prst="rect">
                                                                <a:avLst/>
                                                            </a:prstGeom>
                                                        </pic:spPr>
                                                    </pic:pic>
                                                </a:graphicData>
                                            </a:graphic>
                                        </wp:inline>
                                    </w:drawing>
                                </w:r>
                            </w:p>
                        `;
                        
                        processedText = parts[1] || '';
                        imageIndex++;
                    });
                    
                    // 添加剩余文本
                    if (processedText.trim()) {
                        documentContent += `<w:p><w:r><w:t>${escapeXml(processedText)}</w:t></w:r></w:p>`;
                    }
                } else {
                    // 普通文本段落
                    if (text.trim()) {
                        documentContent += `<w:p><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;
                    } else {
                        documentContent += '<w:p/>'; // 空行
                    }
                }
            }

            // Create the word/document.xml file with network images
            const documentXml = `
                <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" 
                           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                           xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
                           xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                           xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <w:body>
                        ${documentContent}
                    </w:body>
                </w:document>
            `;
            zip.folder('word').file('document.xml', documentXml);

            // Create the [Core Properties] part (optional, but recommended)
            const corePropsXml = `
                <cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                                  xmlns:dc="http://purl.org/dc/elements/1.1/"
                                  xmlns:dcterms="http://purl.org/dc/terms/"
                                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
                    <dc:creator>User</dc:creator>
                    <cp:lastModifiedBy>User</cp:lastModifiedBy>
                    <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
                    <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
                </cp:coreProperties>
            `;
            zip.file('docProps/core.xml', corePropsXml);

            // Return the generated ZIP file as a Blob
            return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        }

        // Function to escape XML special characters
        function escapeXml(str) {
            return str.replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/\r\n?/g, '\n')
                .replace(/\n/g, '</w:t><w:br/><w:t xml:space="preserve">')
                .replace(/'/g, '&apos;');
        }

        // 图片下载函数 - 转换为base64编码
        async function downloadImage(url) {
            try {
                const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
                if (!response.ok) throw new Error(`图片 HTTP ${response.status}`);
                const blob = await response.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.error('图片下载失败:', error);
                signal?.throwIfAborted();
                return null;
            }
        }



        // 下载图片并生成DOCX文件
        signal?.throwIfAborted();
        return {
            blob: await createDocx(paragraphs, validImages),
            title: titleElement?.textContent.trim() || 'extracted_text',
            questionCount: contentElements.length
        };
    }
})();
