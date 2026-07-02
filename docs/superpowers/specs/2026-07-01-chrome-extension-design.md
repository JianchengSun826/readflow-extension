# Chrome Extension MVP — 设计文档

> 创建日期：2026-07-01  
> 状态：待实现  
> 目标平台：Chrome（Manifest V3）

---

## 产品定位

作为 macOS App 的先行 MVP，在浏览器场景验证两个核心功能：
1. **TTS 朗读 + 关键词跳转** — 完整实现，验证核心差异化体验
2. **网页内联笔记** — 在网页/浏览器 PDF 场景部分验证

OCR 分屏识别不在 Extension 范围内，留给后续 macOS App。

---

## 整体架构

```
extension/
├── manifest.json            # 权限声明、入口配置
├── service-worker.js        # 后台逻辑（TTS 状态、笔记协调）
├── content/
│   ├── content-script.js    # 注入每个页面，操作 DOM
│   └── notes.css            # 笔记块样式
└── sidepanel/
    ├── sidepanel.html
    └── App.jsx              # React，主操作面板
```

### 各部分职责

| 部分 | 职责 |
|------|------|
| Side Panel | 主 UI：TTS 控制、关键词输入、笔记列表 |
| Content Script | 页面层：DOM 笔记插入、朗读高亮、与 Side Panel 通信 |
| Service Worker | 后台：TTS 状态管理、chrome.storage 读写 |

### 通信方式

```
Side Panel  ←→  Service Worker  ←→  Content Script
           chrome.runtime.sendMessage / onMessage
```

### 权限声明（manifest.json）

```json
{
  "permissions": ["storage", "activeTab", "scripting", "sidePanel", "tts"],
  "side_panel": { "default_path": "sidepanel/sidepanel.html" }
}
```

---

## 功能一：TTS 朗读 + 关键词跳转

### 朗读流程

```
用户点击「朗读」
  → Content Script 提取页面正文段落列表
  → 用句号/问号/感叹号（含中文标点 。？！）切句，建立句子索引表
  → Service Worker 用 chrome.tts 逐句朗读
  → 每句开始前通知 Content Script 高亮对应句子
  → Side Panel 同步显示当前朗读进度
```

**使用 `chrome.tts`（非 Web Speech API）**：自动调用各平台系统语音（macOS / Windows / Linux），切换 Tab 不中断朗读。中文效果依赖系统已安装的中文语音包，macOS 质量优于 Windows。

### 导航控制

| 操作 | 键盘快捷键 | 实现方式 |
|------|-----------|---------|
| 上一句 | J | 句子索引 -1，重新构造 Utterance |
| 下一句 | K | 句子索引 +1 |
| 上一段 | H | 段落索引 -1 |
| 下一段 | L | 段落索引 +1 |
| 暂停/继续 | Space | `chrome.tts.pause()` / `chrome.tts.resume()` |
| 关键词跳转 | — | 搜索句子索引表，定位第一个匹配句 |

> 快捷键仅在 Side Panel 获得焦点时生效，不与页面原有快捷键冲突。

### Side Panel TTS 区域

```
┌─────────────────────────────────────────┐
│  ▶ 正在朗读第 3 段 / 共 12 段            │
│  "这是当前朗读的句子内容..."              │  ← 高亮
├─────────────────────────────────────────┤
│    ⏮句   ⏮段   ⏸   ⏭段   ⏭句         │
├─────────────────────────────────────────┤
│  🔍 关键词跳转                           │
│  [____________________________]  跳转   │
└─────────────────────────────────────────┘
```

### 句子索引表结构

```js
[
  { paragraphIndex: 0, sentenceIndex: 0, text: "第一句内容。", startChar: 0 },
  { paragraphIndex: 0, sentenceIndex: 1, text: "第二句内容。", startChar: 8 },
  ...
]
```

---

## 功能二：网页内联笔记

### 笔记插入流程

```
用户鼠标悬停段落
  → Content Script 在段落下方显示「+ 添加笔记」按钮
  → 点击后插入 <div class="note-block"> 笔记块
  → 用户输入内容（contenteditable）
  → 失焦时自动保存到 chrome.storage.local
  → 下次访问同页面，Content Script 自动还原笔记
```

### 笔记锚点策略

不依赖 URL（会变化），而是取**段落前 80 字符的哈希**作为锚点 ID：
- 页面加载时遍历所有段落，匹配哈希还原笔记
- 对内容小幅更新的页面有一定容错

### 数据结构

```json
{
  "notes": {
    "https://example.com/article": {
      "a3f9c1d2...": {
        "id": "uuid-v4",
        "content": "<p>笔记内容 HTML</p>",
        "anchorText": "段落前80字，用于重新匹配",
        "createdAt": 1751234567890
      }
    }
  }
}
```

### 笔记块视觉设计

```
┌─ 原文段落 ────────────────────────────────┐
│  这里是原始文章段落内容，用户正常阅读。      │
└───────────────────────────────────────────┘
┌─ 📝 笔记 ───────────────────── ✕ ─────────┐
│  [在这里输入笔记，支持多行...]              │  ← 淡黄色背景
└───────────────────────────────────────────┘
┌─ 原文段落（续）───────────────────────────┐
│  下一段原文内容...                          │
└───────────────────────────────────────────┘
```

- 背景色：`#fffbeb`（淡黄），与原文视觉区分
- 右上角 ✕ 删除笔记，带确认提示
- Side Panel 笔记列表展示当前页面所有笔记，点击跳转到对应位置

### Side Panel 笔记列表区域

```
┌─────────────────────────────────────────┐
│  📝 本页笔记（3 条）                     │
├─────────────────────────────────────────┤
│  > 第1段附近：「这里要重点关注...」        │
│  > 第4段附近：「和上一章的观点矛盾」       │
│  > 第7段附近：「待核实这个数据」           │
└─────────────────────────────────────────┘
```

---

## 技术栈

| 层 | 技术 |
|----|------|
| UI 框架 | React + TypeScript |
| 构建工具 | Vite + CRXJS 插件（专为 Manifest V3 优化） |
| 样式 | Tailwind CSS |
| TTS | `chrome.tts` API |
| 存储 | `chrome.storage.local` |
| 通信 | `chrome.runtime.sendMessage` |

---

## MVP 范围边界

**在范围内：**
- 网页正文 TTS 朗读（按句/段导航 + 关键词跳转）
- 网页段落间内联笔记（插入、编辑、删除、持久化）
- Side Panel 主界面

**不在范围内（后续版本）：**
- PDF 文件朗读与笔记（复杂度高，留给 macOS App）
- OCR 分屏识别（Extension 技术限制，留给 macOS App）
- 笔记导出（v2）
- 多设备同步（v2，需要账号体系）
- 与 macOS App 数据互通（v2）

---

## 后续衔接 macOS App 的预留设计

- 笔记数据结构设计为通用格式（JSON），未来可导出对接 macOS App
- TTS 功能的业务逻辑（句子索引、关键词跳转算法）在 JS 层实现，未来可用 Swift 重写但逻辑一致
- 协议约定：`anchorText` 锚点策略在 macOS App 的 EPUB 笔记中沿用
