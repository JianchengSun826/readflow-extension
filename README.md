# ReadFlow — 网页 & PDF 朗读扩展

Chrome 扩展，支持朗读任意网页和 PDF，可按句/按段导航，支持语音和速度切换。

---

## 当前功能

### 🔊 网页朗读

- 逐句朗读，自动高亮当前段落
- 按句/按段前后跳转
- 点击段落可从该位置开始朗读
- 文字选中后播放，从选区起始段落出发
- 切换标签页后继续播放
- 关闭扩展窗口后 TTS 不中断

**键盘快捷键**（侧边栏需获得焦点）：

| 按键 | 操作 |
|------|------|
| `Space` | 播放 / 暂停 |
| `J` | 上一句 |
| `K` | 下一句 |
| `H` | 上一段 |
| `L` | 下一段 |

### 🎙️ 语音与速度

- 统一语音选择器，中文和英文语音在同一列表中选择
- 中文：精选系统语音（Tingting、Meijia）+ 全部 Google 中文语音
- 英文：Google US/UK English + 常见系统语音（Samantha、Alex 等）
- 速度：0.75× / 1× / 1.25× / 1.5× / 2×
- 切换语音/速度后当前句立即重播，无需重新打开扩展
- 偏好持久保存（`chrome.storage.local`），重启浏览器后保留

### 📄 PDF 朗读

- 打开任意 `.pdf` 链接自动跳转到扩展内置 PDF 阅读器
- 用 PDF.js 提取文字，按段落呈现
- 完整支持朗读导航（按句/按段/速度/语音）
- 单击段落从该位置开始朗读
- 拖选文字后播放，从选区起始段落出发
- 朗读中当前段落高亮并自动滚动

### 🌐 内容提取

- 优先识别 `<p>` / `<li>` / `<h1-h6>` 等语义标签
- fallback：自动识别以 `<div>` + `<br><br>` 组织内容的页面（如部分中文书籍网站）

---

## 安装方法

**环境要求：** Node.js 18+、Chrome 116+

```bash
git clone https://github.com/JianchengSun826/readflow-extension.git
cd readflow-extension/products/chrome-extension
npm install
npm run build
```

1. 打开 `chrome://extensions/`
2. 开启右上角 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择 `dist` 目录

---

## 使用说明

### 朗读网页

1. 打开任意文章页面
2. 点击工具栏 ReadFlow 图标，侧边栏打开
3. 点击 **▶** 开始朗读

### 朗读 PDF

1. 在浏览器中打开任意 `.pdf` 链接，自动跳转到 PDF 阅读器
2. 等待文字提取完成（底部状态消失后）
3. 打开 ReadFlow 侧边栏，点击 **▶** 开始

---

## 开发调试

```bash
npm run build        # 构建
npm test             # 运行测试
npx tsc --noEmit     # 类型检查
```

修改代码后需重新 `npm run build`，然后在 `chrome://extensions/` 点击 ReadFlow 卡片上的 **↺ 重新加载**。

**调试各组件日志：**

| 组件 | 查看方式 |
|------|---------|
| Service Worker | `chrome://extensions/` → ReadFlow → 点击「Service Worker」链接 |
| 内容脚本 | 目标页面 F12 → Console |
| 侧边栏 | 右键侧边栏 → 检查 |
| PDF 阅读器 | 右键 PDF 阅读器页面 → 检查 |

---

## 已知问题

| 问题 | 原因 | 状态 |
|------|------|------|
| 扫描版 PDF 无法朗读 | PDF 内容是图片，没有文字层，PDF.js 无法提取 | 待支持 OCR |
| 需要登录的 PDF 加载失败 | 跳转到扩展页面后丢失原站 Cookie，跨域 fetch 被拒 | 待解决 |
| 部分网页第一句无声 | `voiceschanged` 事件尚未触发，语音列表为空 | 待修复 |
| 语言检测依赖 `<html lang="">` | 无 lang 属性的中文页面会被识别为英语 | 待改为内容检测 |
| PDF 大文件解析慢 | PDF.js 在主线程运行，页数多时会阻塞 UI | 待移至 Worker |

---

## 改进方向

### 近期

- [ ] 扫描版 PDF 支持（接入 Tesseract.js OCR）
- [ ] 语言自动检测改为基于文本内容，不依赖 `lang` 属性
- [ ] 第一句无声问题：等待 `voiceschanged` 后再播放
- [ ] PDF 解析移至 Web Worker，避免阻塞页面
- [ ] PDF 渲染可视化（在提取文字的同时渲染原始版式）

### 中期

- [ ] 朗读进度持久化，关闭后重新打开可从上次位置继续
- [ ] 自定义语音列表（允许用户手动添加/移除候选语音）
- [ ] 支持 EPUB 格式
- [ ] 单词查询（朗读中长按单词触发词典）

### 远期

- [ ] AI 摘要：在侧边栏显示当前段落的 AI 生成简介
- [ ] OCR 分屏伴读：识别屏幕另一侧 App 中的文字并朗读
- [ ] iOS / macOS 原生 App

---

## 技术栈

React 18 · TypeScript (strict) · Vite · CRXJS · Tailwind CSS · Manifest V3 · PDF.js
