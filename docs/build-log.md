# ReadFlow v0.1.0 — 开发全记录

> 从产品想法到 Chrome Web Store 上架材料完备，全程记录。
> 项目仓库：https://github.com/JianchengSun826/readflow-extension

---

## 一、产品构思

### 原始想法

设计一款 PDF / 电子书阅读器，解决传统阅读器笔记与原文「空间割裂」的痛点，三大核心功能：

1. **动态排版笔记** — 笔记直接插入原文排版流，而非悬浮或侧边栏
2. **OCR 分屏伴读** — 屏幕实时识别另一个 App 的文字内容（分屏场景）
3. **有声书 TTS** — 电子书转语音，支持按句/段/关键词精准跳转

### 竞品调研

对每个功能分别调研了现有替代产品（App、网页、Chrome Extension、桌面软件），结论：

- 功能 1（内联笔记）：无完全匹配产品，现有方案均为侧边栏或高亮模式
- 功能 2（OCR 分屏）：macOS 原生 Live Text 接近但不可编程
- 功能 3（TTS + 精准跳转）：播客式 TTS 工具多，但无关键词跳转能力

### 可行性分析

分析了三条技术路线：
- **macOS App**（Swift + SwiftUI + ScreenCaptureKit + AVSpeechSynthesizer）— 能力最完整，但开发周期长
- **Chrome Extension**（React + Manifest V3 + chrome.tts）— 验证核心差异化功能最快
- **Web App** — 受浏览器沙箱限制，OCR 无法实现

### 决策

**先做 Chrome Extension MVP**，验证 TTS + 内联笔记两个核心体验，OCR 留给后续 macOS App。

---

## 二、技术设计

### 整体架构

```
extension/
├── manifest.json              # MV3 权限声明
├── src/
│   ├── shared/
│   │   ├── messages.ts        # 所有消息类型（discriminated union）
│   │   └── storage.ts         # chrome.storage.local 封装
│   ├── utils/
│   │   ├── tokenizer.ts       # 中英文分句
│   │   └── hash.ts            # SHA-256 段落锚点哈希
│   ├── content/
│   │   ├── extractor.ts       # DOM 段落提取
│   │   ├── notes.ts           # 内联笔记 DOM 操作
│   │   ├── highlighter.ts     # TTS 高亮
│   │   ├── index.ts           # Content Script 入口
│   │   └── notes.css          # 笔记样式
│   ├── background/
│   │   └── service-worker.ts  # TTS 状态机
│   └── sidepanel/
│       ├── App.tsx             # 主 Shell（两个 Tab）
│       ├── hooks/
│       │   ├── useTts.ts
│       │   └── useNotes.ts
│       └── components/
│           ├── TtsPanel.tsx
│           └── NotesPanel.tsx
```

### 关键设计决策

| 问题 | 决策 | 原因 |
|------|------|------|
| TTS API | `chrome.tts`（非 Web Speech API）| 切 Tab 不中断；调用系统语音，macOS 质量更好 |
| 笔记锚点 | 段落前 80 字 SHA-256 哈希前 16 位 | 不依赖 URL，对内容小改有容错 |
| 笔记存储 URL key | `origin + pathname` | 排除 UTM 参数、hash 变化导致笔记消失 |
| 笔记内容存储 | `textContent`（非 `innerHTML`）| 防止存储型 XSS |
| 分句规则 | 中英文标点 `。！？.!?` + 可选引号 | 同时支持中英文文章 |

### Tech Stack

- React 18 + TypeScript strict mode + Vite
- CRXJS vite-plugin（MV3 专用打包）
- Tailwind CSS（amber 主色调）
- Vitest + jsdom（单元测试）
- chrome.tts / chrome.storage.local / Chrome Side Panel API

---

## 三、实现过程（9 个任务）

使用 **Subagent-Driven Development** 模式：每个 Task 由独立子 Agent 实现，实现后由评审 Agent 做规格合规 + 代码质量双重审查，发现问题立即修复再评审。

### Task 1 — 项目脚手架
`90b9183..c616ca3`

- 用 CRXJS + Vite 初始化 Chrome Extension 项目
- 配置 TypeScript strict mode、Tailwind、Vitest
- 清理 Vite 默认脚手架文件

### Task 2 — 共享类型 + 工具函数
`c616ca3..d650bc4`

核心产出：
- `messages.ts` — 16 种消息类型的 discriminated union（`TTS_START`、`TTS_HIGHLIGHT`、`NOTE_SAVE` 等）
- `storage.ts` — `getNotes` / `saveNote` / `deleteNote`，以 URL 为 key、anchorHash 为子 key
- `tokenizer.ts` — `tokenizeSentences`（中英文分句）、`buildSentenceIndex`（跨段落全局索引）
- `hash.ts` — `hashAnchor`（SHA-256，取前 16 位）

### Task 3 — Content Script 段落提取
`d650bc4..742f794`

- `extractParagraphs()` — 查询 `p, li, blockquote, h1-h6`，过滤 <10 字符的元素
- `buildPageIndex()` — 委托 `buildSentenceIndex` 构建全页面句子索引表

### Task 4 — Content Script 内联笔记
`742f794..e82b61e`

- `insertNoteBlock(targetElement, anchorHash)` — 在段落下方插入 `<div class="note-block">`
- `attachNoteButtons()` — mouseenter/mouseleave 挂载「+ 笔记」按钮（双插入防护）
- `initNotes()` — 页面加载时还原已保存笔记
- 安全实践：使用 `textContent` 存取内容（非 `innerHTML`），防止存储型 XSS

### Task 5 — Service Worker TTS 引擎
`e82b61e..5a16477`

- `findKeywordIndex(sentences, keyword)` — 返回第一个匹配句的 globalIndex
- `buildTtsState(sentences, index, playing)` — 构造 TtsState 对象
- `handleMessage()` — 处理 9 种 TTS 消息：START / PAUSE / RESUME / STOP / NEXT_SENTENCE / PREV_SENTENCE / NEXT_PARAGRAPH / PREV_PARAGRAPH / JUMP_KEYWORD
- `speakCurrent()` — 调用 `chrome.tts.speak`，广播 `TTS_HIGHLIGHT` 和 `TTS_STATE_UPDATE`
- 15 个测试全部通过

### Task 6 — Content Script TTS 高亮 + 入口串联
`5a16477..0cac774`

- `highlighter.ts` — `highlightSentence(para)` / `clearHighlight()`
- `content/index.ts` — 完整初始化：笔记还原 + 按钮挂载 + TTS 高亮监听 + GET_SENTENCES 响应

### Task 7 — Side Panel TTS 控制 UI
`0cac774..440cc05`

- `useTts` hook — 管理 TtsState，封装所有 TTS 操作
- `TtsPanel` 组件 — 进度显示、播放/暂停、导航按钮、关键词跳转输入框
- 修复计划书 bug：`useState` → `useEffect` 注册消息监听器（原计划书错误）
- 补充计划书遗漏：`messages.ts` 添加 `GET_SENTENCES` 类型；content script 添加响应处理

### Task 8 — Side Panel 笔记列表 UI
`440cc05..f5c10a8`

- `useNotes` hook — 加载当前页笔记，提供 `scrollToNote`
- `NotesPanel` 组件 — 空状态 + 笔记列表，点击滚动到对应段落
- 修复计划书安全问题：`{note.content}` 替代 `dangerouslySetInnerHTML`
- `messages.ts` 添加 `SCROLL_TO_ANCHOR` 类型；content script 添加滚动处理

### Task 9 — Side Panel App Shell
`fc684df..406acca`

- `App.tsx` — 两 Tab 主界面（🔊 朗读 / 📝 笔记），amber 主题 tab 指示器
- `npm run build` 通过，30 个测试全部通过，TypeScript 零错误
- 打标签 `v0.1.0`

---

## 四、最终代码审查

对整个分支（`90b9183..406acca`，15 个 commit）进行了全面代码审查，发现并修复：

### Critical 问题（已修复）

| 问题 | 修复 |
|------|------|
| 点击工具栏图标不打开 Side Panel | 添加 `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` |
| TTS 高亮用 globalIndex 直接索引段落数组（错误）| 通过句子索引缓存将 globalIndex → paragraphIndex 正确映射 |
| `highlighter.ts` 创建 mark 元素但从未插入 DOM | 重写为类名切换 + scrollIntoView |

### Important 问题（已修复）

| 问题 | 修复 |
|------|------|
| 笔记删除混用 `id` / `anchorHash` 两套身份标识 | 统一用 `anchorHash` 作为删除 key |
| `deleteNote` 写入错误的 storage key | 改为使用 `NOTES_KEY` 嵌套结构，与 `getNotes`/`saveNote` 一致 |
| TTS_PAUSE/STOP/end 不广播 TTS_STATE_UPDATE | 所有状态变化都广播；`buildTtsState` 增加 `playing` 参数 |
| 键盘快捷键完全缺失 | 在 TtsPanel 添加 `useEffect` keydown 监听（Space/J/K/H/L）|
| 笔记按完整 URL（含 query string）分桶 | 改为 `origin + pathname` |

---

## 五、项目交付物

### 代码

- GitHub 仓库：https://github.com/JianchengSun826/readflow-extension
- 分支：`main`，共 20 个 commit
- 标签：`v0.1.0`
- 测试：30 个测试，5 个测试文件，全部通过
- TypeScript：strict mode，零错误

### 文件结构

```
readflow-extension/
├── extension/                  # 扩展源码
│   ├── manifest.json
│   ├── src/
│   │   ├── shared/             # 共享类型和存储
│   │   ├── utils/              # 分句器、哈希工具
│   │   ├── content/            # Content Script
│   │   ├── background/         # Service Worker
│   │   └── sidepanel/          # React Side Panel UI
│   └── README.md               # 英文使用说明
└── docs/
    ├── privacy-policy.html     # 隐私政策（GitHub Pages 托管）
    ├── store-listing.md        # Chrome Web Store 文案
    └── superpowers/
        ├── specs/              # 设计文档
        └── plans/              # 实现计划
```

### Chrome Web Store 上架材料

| 材料 | 状态 | 地址 |
|------|------|------|
| 扩展图标 16/48/128px | ✅ | `extension/src/assets/icons/` |
| manifest.json 图标配置 | ✅ | 已更新 |
| 隐私政策（英文，公开 URL）| ✅ | https://jianchengsun826.github.io/readflow-extension/privacy-policy.html |
| 商店描述文案（英文）| ✅ | `docs/store-listing.md` |
| 截图（1280×800）| ❌ 待手工截图 | 需在真实页面录制 |

---

## 六、上架步骤（待完成）

1. **截图** — 在真实中文文章页面测试，截取 4 张 1280×800 截图（见 `docs/store-listing.md` 描述）
2. **注册开发者账号** — https://chrome.google.com/webstore/devconsole，支付 $5（约 36 元）一次性注册费
3. **上传扩展包** — `npm run build` 后压缩 `dist/` 文件夹为 ZIP 上传
4. **填写商店信息** — 使用 `docs/store-listing.md` 中的文案
5. **填写隐私政策 URL** — `https://jianchengsun826.github.io/readflow-extension/privacy-policy.html`
6. **提交审核** — 首次审核约 1-3 个工作日

---

## 七、后续路线图

### v0.2（Chrome Extension）
- [ ] 笔记导出为 Markdown
- [ ] TTS 语速/音量控制
- [ ] 多语言语音选择

### v1.0（macOS App）
- [ ] WKWebView 渲染 HTML/EPUB
- [ ] ScreenCaptureKit + Vision 框架实现 OCR 分屏伴读
- [ ] AVSpeechSynthesizer 替代 chrome.tts
- [ ] SwiftUI + SwiftData 持久化
- [ ] 与 Extension 笔记数据互通（JSON 导出格式已预留兼容）
