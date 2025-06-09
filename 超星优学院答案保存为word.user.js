// ==UserScript==
// @name         超星优学院答案保存为word
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  Extract text from specific elements, modify it, and save as a DOCX file
// @author       e7g
// @match      	 *://*.chaoxing.com/*work*view*
// @match      	 *://*.chaoxing.com/*exam*
// @match      	 *://*.chaoxing.com/*selectWorkQuestionYiPiYue*
// @match      	 *://homework.ulearning.cn/*
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
        return 'unknown';
    }

    // const titleElement = document.getElementsByClassName("mark_title")[0];//||document.getElementsByClassName("ceyan_name")[0].children[0]
    const currentSite = getSiteType();
    // 调整标题选择逻辑，增加测验页面支持
    const titleElement = currentSite === 'chaoxing' ?
        document.getElementsByClassName("mark_title")[0] :
        currentSite === 'chaoxing_quiz' ?
            document.querySelectorAll('.ceyan_name h1, .ceyan_name h2, .ceyan_name h3, .ceyan_name h4, .ceyan_name h5, .ceyan_name h6')[0] :
            document.querySelectorAll('.ul-page__header h1, .ul-page__header h2, .ul-page__header h3, .ul-page__header h4, .ul-page__header h5, .ul-page__header h6')[0];
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

    button.addEventListener('dblclick', function (e) {
        if (isDragging) {
            e.stopPropagation();
            e.preventDefault();
            return;
        }

        // Extract text from elements with class "aiAreaContent"
        const contentElements = currentSite == "chaoxing" ? document.getElementsByClassName("aiAreaContent") :
            currentSite === 'chaoxing_quiz' ? document.getElementsByClassName("aiAreaContent") : document.getElementsByClassName("question-item");
        const paragraphs = [];

        for (let i = 0; i < contentElements.length; i++) {
            const contentElement = contentElements[i];

            if (currentSite === "chaoxing") {
                // Find and modify the element with class "colorShallow"
                const colorShallowElement = contentElement.getElementsByClassName("colorShallow")[0];
                if (colorShallowElement) {
                    const originalText = colorShallowElement.innerText;
                    const modifiedText = '【' + originalText.match(/..题/g)[0] + '】';
                    colorShallowElement.innerText = modifiedText;
                }

                // 获取类名为 "colorGreen marginRight40 fl" 的第一个元素
                const colorGreenElement = contentElement.getElementsByClassName("colorGreen")[0];

                // 获取类名为 "mark_answer" 的第一个元素
                const markAnswerElement = contentElement.getElementsByClassName("mark_answer")[0];

                // 检查这两个元素是否存在
                if (colorGreenElement && markAnswerElement) {
                    markAnswerElement.innerText = colorGreenElement.innerText;
                }

            } else if (currentSite === "chaoxing_quiz") {

                // 优化获取元素的逻辑，使用可选链操作符避免空值错误
                // const zyTitleElement = contentElement.querySelector('.aiAreaContent .Zy_TItle .fl');
                // if (zyTitleElement) {
                //     zyTitleElement.innerText += '.';
                // }

                // 使用更具描述性的变量名，并使用 querySelector 替代 getElementsByClassName
                const correctAnswerElement = contentElement.querySelector('.correctAnswerBx');
                const newAnswerElement = contentElement.querySelector('.newAnswerBx');

                // 检查这两个元素是否存在
                if (correctAnswerElement && newAnswerElement) {
                    newAnswerElement.innerText = correctAnswerElement.innerText;
                }
            }
            // Add the modified content to the paragraphs array
            paragraphs.push(contentElement.innerText.trim());
            if (currentSite === "ulearning") {
                function extractUlearningAnswer(element) {
                    // 检测题型类型
                    if (element.querySelector('.choice-item')) {
                        // 处理多选题
                        const options = Array.from(element.querySelectorAll('.choice-item')).map(item => {
                            const index = item.querySelector('.index').textContent.trim().replace('.', '');
                            const text = item.querySelector('.choice-title').textContent.trim();
                            return `${index}.${text}`;
                        });
                        const selected = [...new Set(  // 使用Set去重
                            Array.from(element.querySelectorAll('.is-checked')).map(item =>
                                item.closest('.choice-item').querySelector('.index').textContent.trim().replace('.', '')
                            )
                        )];
                        return `当前选项：${selected.join(',')}`;
                    }
                    else {
                        // 处理判断题（原有图标转换逻辑）
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
                        return `${options.join(' ')}\n当前选项：${selected}`;
                    }
                }

                const answerElement = contentElement.querySelector(".choice-list, .answer-area");
                if (answerElement) {
                    paragraphs.push(extractUlearningAnswer(answerElement));
                }

            }
            paragraphs.push(''); // Add a blank line between paragraphs
        }

        // Function to create a simple DOCX file
        function createDocx(paragraphs) {
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

            // Create the word/document.xml file
            const documentXml = `
                <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                    <w:body>
                        ${paragraphs.map(p => `<w:p><w:r><w:t>${escapeXml(p)}</w:t></w:r></w:p>`).join('')}
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
                    <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/[-T:\.Z]/g, '').slice(0, 14)}</dcterms:created>
                    <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/[-T:\.Z]/g, '').slice(0, 14)}</dcterms:modified>
                </cp:coreProperties>
            `;
            zip.file('docProps/core.xml', corePropsXml);

            // Return the generated ZIP file as a Blob
            return zip.generateAsync({ type: 'blob' });
        }

        // Function to escape XML special characters
        function escapeXml(str) {
            return str.replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/\n{2,}/g, '\n')
                .replace(/[\n\r]/g, '<w:br/>')
                .replace(/'/g, '&apos;');
        }

        // 创建DOCX文件并触发下载
        createDocx(paragraphs).then(function (blob) {
            const fileName = (titleElement ? titleElement.innerText.trim() : 'extracted_text') + '.docx';
            saveAs(blob, fileName);
        }).catch(function (error) {
            console.error('Error creating DOCX file:', error);
        });
    });
})();