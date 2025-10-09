# chaoxing_ulearning_Answer_to_Word
 超星优学院答案保存为word


![GPL-3.0 License](https://img.shields.io/badge/license-GPL--3.0-blue) 
![Tampermonkey Version](https://img.shields.io/badge/Tampermonkey-v4.16-green)

多平台智能答案导出工具，支持超星、优学院、长江雨课堂等平台的题目与答案一键保存为包含图片的Word文档。

```bash
// ==UserScript==
// @name         超星优学院答案保存为word
// @version      0.1.2
// @match        *://*.chaoxing.com/*work*view*
// @match        *://*.chaoxing.com/*exam*
// @match        *://*.chaoxing.com/*selectWorkQuestionYiPiYue*
// @match        *://homework.ulearning.cn/*
// @match        *://changjiang-exam.yuketang.cn/result/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// ==/UserScript==
```

## 🌟 功能特性 
1. **多平台智能识别**
   - 超星学习通（`chaoxing.com`）- 支持作业、考试、测验页面
   - 优学院（`ulearning.cn`）- 支持作业详情页
   - 长江雨课堂（`changjiang-exam.yuketang.cn`）- 支持考试结果页
   - 自动识别站点类型并加载对应解析规则

2. **完整答案提取**
   - 单选题、多选题、判断题答案识别
   - 用户答案与正确答案对比显示
   - 选项内容完整提取（A. xxx, B. xxx...）

3. **图片智能处理**
   - 自动下载题目中的图片
   - 转换为base64编码嵌入Word文档
   - 保留图片alt文本信息
   - 原始图片地址记录

4. **专业文档生成**
   - 标准DOCX格式，兼容Microsoft Word
   - 自动题型标识（【单选题】、【多选题】等）
   - 清晰的答案对比格式：我的答案 vs 正确答案
   - 支持换行符和段落格式保留

## 🚀 快速安装
### 基础环境
1. 安装[Tampermonkey扩展](https://www.tampermonkey.net/)
2. 手动下载[安装脚本](https://github.com/E7G/chaoxing_ulearning_Answer_to_Word/raw/refs/heads/main/%E8%B6%85%E6%98%9F%E4%BC%98%E5%AD%A6%E9%99%A2%E7%AD%94%E6%A1%88%E4%BF%9D%E5%AD%98%E4%B8%BAword.user.js)

### 依赖管理
脚本会自动加载以下依赖：
- JSZip 3.7.1 - 用于创建DOCX文件
- FileSaver.js 2.0.5 - 用于文件下载

无需手动安装，脚本运行时会自动从CDN加载。

## 🛠 使用指南 
1. 访问支持的页面：
   - **超星平台**：作业、考试、测验页面（URL包含 `chaoxing.com`）
   - **优学院**：作业详情页（`homework.ulearning.cn`）
   - **长江雨课堂**：考试结果页（`changjiang-exam.yuketang.cn/result/`）

2. 操作步骤：
   - 页面右上角会出现悬浮按钮，显示当前识别到的站点类型
   - **双击按钮**触发答案提取（单击拖动可调整位置）
   - 脚本自动下载图片、生成DOCX文件并保存到本地

3. 界面说明：
   | 元素 | 功能 | 备注 |
   |------|------|------|
   | 悬浮按钮 | 显示当前站点类型 | 如：超星学习通、优学院等 |
   | 双击触发 | 开始答案提取 | 防止误触设计 |
   | 拖动定位 | 调整按钮位置 | 拖动阈值5px |

4. 文档格式：
   ```
   【题型】
   题目内容（含图片占位符）
   
   选项：
   A. 选项1
   B. 选项2
   
   我的答案: A. 选项1
   正确答案: B. 选项2
   ```

## ⚠️ 注意事项 
1. **网络要求**
   - 需要稳定的网络连接（用于下载图片和CDN资源）
   - 部分平台可能需要登录状态才能访问题目内容

2. **兼容性说明**
   - 仅支持现代浏览器（Chrome/Firefox/Edge）
   - 不兼容IE浏览器
   - 需要支持ES6+语法

3. **图片处理**
   - 图片会自动下载并嵌入到Word文档中
   - 大图片可能会增加文档大小和生成时间
   - 网络图片下载失败时会自动跳过

4. **异常处理**
   - 生成失败时会显示错误提示
   - 控制台会输出详细的错误信息用于调试
   - 建议开启浏览器开发者工具查看日志

## 🤝 参与贡献 
欢迎通过以下方式参与项目：

1. **问题反馈**
   - 创建[GitHub Issue](https://github.com/E7G/chaoxing_ulearning_Answer_to_Word/issues)
   - 提供详细信息：
     - 问题页面URL
     - 浏览器控制台日志（F12打开）
     - 复现步骤
     - 期望 vs 实际结果

2. **功能建议**
   - 支持新平台适配
   - 文档格式优化
   - 用户体验改进

3. **代码贡献**
   - Fork项目后直接修改
   - 提交Pull Request
   - 遵循现有代码风格

## 📜 许可证
GPL-3.0 Licensed - 查看完整协议内容请访问[LICENSE](LICENSE)

---

> **⚠️ 重要提示**：本脚本仅用于学习研究目的，请遵守各平台的使用条款和学术诚信原则。请勿将导出的内容用于作弊或其他违反学术道德的行为。

## 🔗 相关链接
- [Tampermonkey官网](https://www.tampermonkey.net/)
- [GPL-3.0许可证详情](https://www.gnu.org/licenses/gpl-3.0.html)
- [项目GitHub仓库](https://github.com/E7G/chaoxing_ulearning_Answer_to_Word)