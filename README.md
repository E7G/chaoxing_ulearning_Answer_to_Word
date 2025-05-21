# chaoxing_ulearning_Answer_to_Word
 超星优学院答案保存为word


![GPL-3.0 License](https://img.shields.io/badge/license-GPL--3.0-blue) 
![Tampermonkey Version](https://img.shields.io/badge/Tampermonkey-v4.16-green)

专为超星/优学院平台设计的自动化答案导出工具，支持将题目与正确答案一键保存为结构化Word文档。

```bash
// ==UserScript==
// @name         超星优学院答案保存为word
// @match        *://*.chaoxing.com/*work*view*
// @match        *://homework.ulearning.cn/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js
// ==/UserScript==
```

## 🌟 功能特性 
1. **跨平台支持**
   - 同时兼容超星学习通（`chaoxing.com`）和优学院（`ulearning.cn`）
   - 智能识别当前站点并自动适配解析规则

2. **精准答案提取**
   ```javascript
   // 超星解析逻辑
   const colorGreenElement = contentElement.getElementsByClassName("colorGreen")[0];
   // 优学院多选题处理
   const options = Array.from(element.querySelectorAll('.choice-item')).map(...);
   ```

3. **智能文档格式化**
   - 自动添加题型标识（如【单选题】）
   - 保留原始题目层级结构
   - 支持换行符转换（`\n` → Word换行）

4. **增强交互设计**
   - 浮动可拖拽操作按钮
   - 双击防误触机制（拖动阈值5px）
   - 实时站点类型提示

## 🚀 快速安装
### 基础环境
1. 安装[Tampermonkey扩展](https://www.tampermonkey.net/)
2. 手动下载安装脚本

### 依赖管理
```html
<!-- 自动加载的库 -->
<script src="https://cdnjs.cloudflare.com/.../jszip.min.js"></script>
<script src="https://cdnjs.cloudflare.com/.../FileSaver.min.js"></script>
```

## 🛠 使用指南 
1. 访问支持的页面：
   - 超星作业/考试页面
   - 优学院作业详情页

2. 界面元素说明：
   | 元素 | 位置 | 功能 |
   |------|------|------|
   | 悬浮按钮 | 页面右上角 | 显示当前站点类型 |
   | 拖拽区域 | 按钮任意位置 | 支持自由定位 |

3. 双击保存流程：
   ```
   触发条件 → 内容解析 → XML生成 → ZIP打包 → DOCX下载
   ```

## ⚠️ 注意事项 
1. **权限要求**
   - 需要`@grant none`运行模式
   - 依赖跨域CDN资源加载

2. **兼容性说明**
   - 仅支持现代浏览器（Chrome/Firefox/Edge）
   - 不兼容IE浏览器

3. **异常处理**
   ```javascript
   try {
     createDocx().then(...)
   } catch (error) {
     console.error('DOCX生成错误:', error);
   }
   ```

## 🤝 参与贡献 
欢迎通过以下方式参与项目：
1. **问题反馈**
   - 创建[GitHub Issue]
   - 提供：① 问题页面URL ② 控制台日志 ③ 复现步骤

2. **开发协作**
   - 直接修改即可

## 📜 许可证
GPL-3.0 Licensed - 查看完整协议内容请访问[LICENSE](LICENSE)
---

> 提示：本脚本仅用于学习研究，请遵守平台使用规则。


