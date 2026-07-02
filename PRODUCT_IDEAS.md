# PDF / 电子书 智能阅读器 — 产品想法记录

> 状态：概念阶段  
> 最后更新：2026-07-01（技术栈设计完成）

---

## 一句话描述

一款解决传统阅读器"笔记不灵活"痛点的电子书 / PDF 阅读器，支持动态排版留白、OCR 实时识别、以及有声书播放三大核心能力。

---

## 核心痛点

传统电子书 / PDF 阅读器（Kindle、PDF Expert、GoodNotes 等）无法在原文的任意位置灵活插入笔记，要么只能在边栏批注，要么只能高亮，笔记与原文的空间关系割裂，不直观。

---

## 功能模块

### 1. 动态排版笔记（核心功能）

- 以阅读器模式打开电子书或 PDF 时，用户可以在任意段落上下方**插入空白行**，用于手写或键盘输入笔记
- 笔记与原文在同一排版流中共存，视觉上"夹"在原文之间，而非侧边栏
- 支持折叠 / 展开笔记区域，不影响原始阅读体验
- 待探索：笔记区域是否支持 Markdown、富文本、手绘？

### 2. OCR 实时识别（分屏伴读模式）

- 目标场景：**电脑分屏** 或 **iPad 分屏**
  - 左侧：任意电子书 App（如 Kindle、微信读书）正常阅读
  - 右侧：本软件实时 OCR 识别屏幕/摄像头捕捉到的书页内容
- OCR 识别后，在本软件侧生成可编辑文字，用户可直接在识别文字旁添加笔记
- 未来支持：将 OCR 文字 + 笔记导出，生成带注释的文档，方便事后对照原文与批注
- 待确认：OCR 是本地模型还是云端 API？隐私需求？

### 3. 有声书转换与智能播放

- 将导入的电子书（epub / txt / PDF）转为音频（TTS）进行播放
- 播放控制粒度：
  - 返回**上一句**
  - 返回**上一段**
  - 按**关键词索引**跳转到指定内容
- 播放进度与文字高亮同步，便于跟读
- 待探索：TTS 引擎选择（系统自带 vs 第三方，如 Azure / ElevenLabs）？多语言支持？

---

## 目标平台

| 平台 | 优先级 | 备注 |
|------|--------|------|
| macOS（桌面端） | 高 | 分屏场景主力 |
| iPad | 高 | 手写笔记 + 分屏场景 |
| iOS | 中 | 移动阅读场景 |
| Windows | 低 | 可后续考虑 |

---

## 竞品调研（2026-07-01）

> 通过多源网络调研 + 对抗性验证（19 条确认结论）整理。

### 功能一：动态排版留白笔记

**结论：目前几乎没有真正的替代产品，是三个功能中差距最大的空白。**

| 产品 | 平台 | 能力 | 差距 |
|------|------|------|------|
| MarginNote 4 | iPad/Mac | 高亮自动生成卡片，关联思维导图和闪卡 | 笔记是卡片对象，不插入文档排版流；"inline 模式"经验证不属实 |
| Xournal++ | 桌面 | PDF 手写批注 | 只在 PDF 层叠加，不向文本流插入空白行 |
| GoodNotes / Notability | iPad | 手写笔记 | 固定排版，笔记写在页面空白区而非原文之间 |

### 功能二：屏幕 OCR 分屏识别

**结论：工具很多，但全部是手动触发，无一支持连续实时监听。**

| 产品 | 平台 | 触发方式 | 备注 |
|------|------|----------|------|
| TextSniper | macOS | CMD+Shift+2 | 最佳 macOS 选项，支持识别任何屏幕内容 |
| OwlOCR | macOS | CMD+F1 | 支持多区域同时选取（Pro 最多 20 个）；"实时"模式经验证不属实 |
| PowerToys Text Extractor | Windows | Win+Shift+T | 微软官方，框选即识别 |
| Capture2Text | Windows | Win+Q | 完全离线，结果直接进剪贴板 |
| Umi-OCR | Windows | 快捷键 | 开源免费，离线（PaddleOCR），中文友好 |
| Copyfish | Chrome 扩展 | 手动 | 桌面需额外安装 UI.Vision 模块 |

**空白点**：所有工具均为"截一次识别一次"，无产品支持持续监听屏幕区域、自动追踪滚动内容。

### 功能三：有声书 TTS + 精准跳转

**结论：按句/段导航已有产品做到，但按关键词跳转是全行业空白。**

| 产品 | 平台 | 按句 | 按段 | 按关键词 | 备注 |
|------|------|:----:|:----:|:--------:|------|
| Voice Dream Reader | iOS/macOS | ✓ | ✓ | ✗ | 仅支持无 DRM 文件 |
| lue（开源 CLI） | 桌面 | ✓ (j/k) | ✓ (h/l) | ✗ | 无 GUI |
| Speechify | 全平台 | ✓ | ✓ | ✗ | 200+ 语音，60+ 语言 |
| abogen（开源） | 桌面 | 仅字幕同步 | — | ✗ | 只生成文件，无内置播放器；中文无词级同步 |
| Paper2Audio | 网页 | ✗ | ✗ | ✗ | 只支持章节目录跳转 |
| 微信读书 / 掌阅等 | 移动端 | ✗ | ✗ | ✗ | 均止步于章节级别 |

---

## 技术可行性分析（2026-07-01）

> 通过多源网络调研 + 对抗性验证（12 条确认结论）整理。

### 功能一：动态排版留白笔记

**EPUB 中等偏易 / PDF 极难**

**PDF 的根本障碍**：PDF 是固定坐标格式，每个字符都有绝对 x/y 坐标，没有"文本流"概念。在两行之间插入空白意味着其后所有内容坐标整体下移，等于重新生成整个页面。
- `PyMuPDF.Document.insert_page()` 只能插入整页，不能插入行内空白
- `Document.layout()` 可对可重排格式（HTML/ebook）重新分页，但是全局操作，非局部插入
- Calibre 的 PDF reflow 引擎用启发式方法（测量行间垂直间距）检测段落，无法区分用户插入的空白和原始段落间距

**推荐路径**：对 PDF 不直接修改原文件，先用 PyMuPDF / Calibre 转换为 HTML，在 HTML 层操作文档流后渲染展示。代价是原始排版有一定损耗。

**EPUB 可行**：EPUB 本质是 HTML+CSS，插入 `<div>` 空白块是标准 DOM 操作，工程量主要在笔记数据与文档内容的绑定和持久化。

| 格式 | 难度 | 推荐方案 |
|------|------|---------|
| EPUB | ★★☆☆☆ | 直接操作 HTML DOM |
| PDF | ★★★★★ | 先转 HTML，再插入，有排版损耗 |

### 功能二：屏幕实时 OCR 分屏识别

**macOS 中等 / iPad 较难**

**完整技术栈（全 Apple 原生）**：

```
ScreenCaptureKit → 持续帧捕获（最高 60fps，CMSampleBuffer）
        ↓ 帧间差分变化检测（节流）
Vision.VNRecognizeTextRequest → 每帧 OCR（iOS 13+ / macOS 10.15+）
        ↓
App UI → 显示识别文字 + 笔记输入
```

- ScreenCaptureKit 通过 `SCContentFilter` 锁定特定窗口/区域，`SCStream` 持续推送帧，**无需手动触发**（已确认）
- VNRecognizeTextRequest 是**单张图像处理**，不是流式 OCR，需要逐帧调用
- 两者没有内置整合，需自行将 CMSampleBuffer 转为 CGImage 再送入 Vision

**主要工程挑战**：
- 持续 60fps 跑 OCR 会严重占用 CPU/GPU，需实现**帧间差分变化检测**，只在内容变化时触发 OCR
- OCR 结果需去重/合并，避免同一段文字重复输出
- 即使是 SwiftyCrow（最接近的开源参考）也未实现真正的持续监听，需自研这部分逻辑

**iPad 限制**：无 ScreenCaptureKit 多窗口捕获，需改用 ReplayKit，复杂度更高，列为后续版本。

| 平台 | 难度 | 主要工作 |
|------|------|---------|
| macOS | ★★★☆☆ | 变化检测 + OCR 节流需自研 |
| iPad | ★★★★☆ | ReplayKit 替代 + 权限模型更严格 |

### 功能三：TTS + 关键词跳转

**难度最低，核心 API 已就绪**

**路径 A — 实时 TTS（推荐）**

`AVSpeechSynthesizerDelegate.willSpeakRangeOfSpeechString` 回调在每个词朗读前触发，返回该词在原始字符串中的 `NSRange`，可实时建立"文本位置 → 朗读进度"映射：

```
用户输入关键词
    → 在原文字符串中搜索位置（NSRange）
    → 构造新 Utterance 从该位置开始朗读
    → 实现关键词跳转（纯字符串操作，延迟极低）
```

**路径 B — 预生成音频**

aeneas 工具可将文本与音频对齐，输出 SMIL/SRT/JSON 时间戳映射，支持"关键词 → 时间戳 → 音频 seek"。适合需要导出音频文件的场景，但中文支持未完全确认，流程较重。

**主要障碍**：
- 长文档需分段处理，单个 Utterance 不能过长（内存/延迟问题）
- 中文分词边界：AVSpeechSynthesizer 的词级回调对中文准确度需实测

| 路径 | 难度 | 适用场景 |
|------|------|---------|
| 实时 TTS（AVSpeechSynthesizer） | ★★☆☆☆ | 在线朗读，延迟低 |
| 预生成音频（aeneas） | ★★★☆☆ | 需导出音频文件的场景 |

### 综合优先级建议

| 功能 | 可行性 | 市场空白 | 建议优先级 |
|------|--------|---------|-----------|
| TTS + 关键词跳转 | 高 | 完整空白 | **第一优先，先做 MVP** |
| OCR 分屏识别（macOS） | 中 | 实时监听是空白 | 第二优先 |
| EPUB 动态排版留白 | 中 | 完整空白 | 第三优先 |
| PDF 动态排版留白 | 极低 | — | **建议放弃**，改为 PDF→HTML 转换后支持 |

---

## 开放问题 / 待决策

- [x] ~~动态排版的底层实现：重新排版 PDF？还是在 PDF 层叠加浮层？~~ → PDF 极难，以 EPUB/HTML 为主，PDF 做导入转换
- [ ] OCR 是实时屏幕截图识别，还是需要摄像头对准实体书？→ 屏幕 OCR 技术可行，优先做
- [ ] 有声书 TTS 是本地还是云端，如何平衡质量与成本？→ 先用系统 AVSpeechSynthesizer 验证逻辑，再接入第三方
- [ ] 笔记数据格式与存储方案（本地优先？iCloud 同步？）
- [ ] 是否需要账号体系 / 多端同步？
- [ ] 中文分词边界：AVSpeechSynthesizer 词级回调对中文的准确度如何，需实测

---

## 技术栈设计（2026-07-01）

> 目标平台：macOS 优先，架构保留 iPad 拓展空间。
> 方向：Swift/SwiftUI 原生为主，WKWebView 承载文档层（Web 技能复用区）。

### 整体架构分层

```
┌─────────────────────────────────────────┐
│           SwiftUI（应用外壳）             │  ← 导航、窗口、权限、设置
├─────────────────────────────────────────┤
│        WKWebView（文档阅读层）            │  ← EPUB 渲染 + 内联笔记
│        HTML / CSS / JS                  │  ← Web 技能直接复用
├────────────────┬────────────────────────┤
│  OCR 引擎       │  TTS 引擎              │
│  ScreenCapture │  AVSpeechSynthesizer   │  ← 纯 Swift，Apple 原生 API
│  + Vision      │  + delegate 回调        │
├────────────────┴────────────────────────┤
│           文档处理层                     │
│  PDFKit（PDF 展示）                      │  ← Swift 原生
│  ZIPFoundation + XMLParser（EPUB 解析）   │  ← Swift 原生
├─────────────────────────────────────────┤
│           数据持久层                     │
│           SwiftData                     │  ← 笔记存储，iCloud 可拓展
└─────────────────────────────────────────┘
```

### 各模块具体技术选型

#### UI 外壳 — SwiftUI
- **窗口管理**：`WindowGroup` + `NavigationSplitView`（左侧文件库，右侧阅读区）
- **OCR 浮窗**：独立 `NSPanel` 浮动窗口，常驻屏幕顶层，不遮挡其他 App
- **权限申请**：屏幕录制权限（OCR 需要）、麦克风（可选，未来语音笔记）

#### 文档阅读 + 笔记 — WKWebView
- **EPUB 渲染**：ZIPFoundation 解压 → 提取 HTML/CSS → 注入笔记脚本 → WKWebView 渲染
- **PDF 渲染**：PDFKit 直接渲染（展示用）；需要排版插入时转 HTML
- **内联笔记**：JS 操作 DOM，在段落后插入 `<div class="note-block">`，`contenteditable` 编辑
- **Swift ↔ JS 通信**：`WKScriptMessageHandler`（JS 调 Swift）+ `evaluateJavaScript`（Swift 调 JS）

#### OCR 引擎 — ScreenCaptureKit + Vision
- **区域选择**：SwiftUI 半透明遮罩 + 拖拽框选
- **帧捕获**：`SCStream` 持续推送 `CMSampleBuffer`
- **变化检测**：帧间像素差分，变化超过阈值才触发 OCR，避免 CPU 浪费
- **文字识别**：`VNRecognizeTextRequest`，语言优先级可配置（中/英）
- **结果输出**：识别文字通过 `WKScriptMessageHandler` 送入笔记区

#### TTS 引擎 — AVSpeechSynthesizer
- **朗读**：`AVSpeechUtterance` 分段（每段约 500 字，避免长文档卡顿）
- **词级同步**：`willSpeakRangeOfSpeechString` 回调 → 实时高亮当前朗读词
- **关键词跳转**：搜索关键词得到 `NSRange` → 构造新 `Utterance` 从该位置开始
- **按句/段导航**：用 `NLTokenizer` 预处理切句切段，存索引，跳转时直接定位

#### 数据持久层 — SwiftData
- **存储内容**：笔记内容、笔记在文档中的锚点位置（段落 ID + 偏移量）、文档元数据
- **笔记格式**：存 HTML 片段，与 WKWebView 层直接互通，无需格式转换
- **iCloud 同步**：SwiftData 原生支持 CloudKit，未来一行配置即可开启

### 技术选型决策记录

| 问题 | 决策 | 原因 |
|------|------|------|
| 跨平台 vs 原生 | 原生 Swift/SwiftUI | OCR 和 TTS 必须原生；SwiftUI 可复用到 iPad |
| Android/Windows | 暂缓 | Android 屏幕捕获受限，OCR 伴读体验会显著降级 |
| PDF 动态排版 | PDF 只做展示，EPUB 做完整排版 | PDF 无文本流，强行修改成本极高 |
| Python 文档处理 | 不引入 | PDFKit + ZIPFoundation 已足够，避免多语言维护 |
| 数据存储 | SwiftData | 现代 Swift API，内置 iCloud，语法简洁 |

---

## Chrome Extension 方案分析（2026-07-01）

### 三个功能在 Extension 中的支持度

| 功能 | 支持度 | 主要限制 |
|------|--------|---------|
| 动态排版笔记 | ★★★☆☆ 部分可用 | 只限浏览器内容，无法覆盖本地 App（Kindle、微信读书等） |
| 屏幕 OCR 分屏 | ★☆☆☆☆ 几乎不可 | Extension 只能截取当前 Tab，无法访问其他 App 屏幕 |
| TTS 关键词跳转 | ★★★☆☆ 可用但受限 | Web Speech API 质量低于系统 TTS，中文效果差；切 Tab 可能中断朗读 |

### 先做 Extension 的可行性

**可行，适合作为 MVP 第一步。** 主要优势：

- Web / React 技能直接上手，无需先学 Swift，上线速度更快
- Chrome Web Store 分发零门槛，快速获取真实用户反馈
- 功能三（TTS + 关键词跳转）可以**完整**在 Extension 中验证
- 功能一（内联笔记）可以在网页文章、Google Drive PDF 上**部分**验证

**需接受的取舍：**
- 功能二（OCR 分屏）完全无法实现，必须留给 macOS App
- 只覆盖浏览器内容，本地 EPUB/PDF 文件无法触达
- 验证的场景是"读网页文章"，与最终目标"读本地电子书"有一定差距

### 建议的两阶段路线

```
阶段一：Chrome Extension MVP（Web 技术栈）
  ├─ 功能三：TTS + 关键词跳转（完整实现）
  ├─ 功能一：网页/浏览器 PDF 内联笔记（部分实现）
  └─ 目标：验证核心 UX，积累用户反馈

阶段二：macOS App（Swift/SwiftUI）
  ├─ 功能二：OCR 分屏识别（Extension 无法实现）
  ├─ 功能一：本地 EPUB/PDF 完整内联笔记
  ├─ 功能三：更高质量原生 TTS
  └─ 与 Extension 共享笔记数据（本地 API 通信）
```

### Extension 技术栈

- **框架**：React + TypeScript（Manifest V3）
- **内联笔记**：Content Script 注入，JS 操作 DOM
- **TTS**：Web Speech API（`SpeechSynthesis`）
- **关键词跳转**：JS 字符串搜索 + `SpeechSynthesisUtterance` 定位
- **数据存储**：`chrome.storage.local`（本地）+ 未来对接 macOS App

---

## 后续想法（待展开）

> 在这里记录闪现的新想法，定期整理到上方模块

-
