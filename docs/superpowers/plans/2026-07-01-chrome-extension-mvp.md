# Chrome Extension MVP 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 Chrome Extension，支持网页 TTS 朗读（含句/段导航 + 关键词跳转）和网页段落间内联笔记。

**Architecture:** Service Worker 管理 TTS 状态机，Content Script 注入页面负责段落提取、高亮和笔记 DOM，Side Panel 提供 React UI。三者通过 `chrome.runtime.sendMessage` 通信。

**Tech Stack:** React 18 + TypeScript + Vite + CRXJS（Manifest V3）+ Tailwind CSS + Vitest + jsdom

## Global Constraints

- Manifest V3（非 V2）
- `chrome.tts` API（非 Web Speech API）
- `chrome.storage.local` 存储笔记
- Side Panel API（Chrome 114+）
- React 18，函数组件 + hooks，无 class component
- TypeScript strict mode
- 所有消息类型在 `src/shared/messages.ts` 中定义，禁止在其他文件中定义新消息类型
- 笔记锚点：段落前 80 字符的 SHA-256 哈希前 16 位

---

## 文件结构

```
extension/
├── manifest.json
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── src/
│   ├── background/
│   │   └── service-worker.ts      # TTS 状态机 + 消息路由
│   ├── content/
│   │   ├── index.ts               # Content script 入口
│   │   ├── extractor.ts           # 从页面提取段落和句子
│   │   ├── highlighter.ts         # 朗读时高亮当前句子
│   │   ├── notes.ts               # 笔记块 DOM 操作
│   │   └── notes.css              # 笔记块样式
│   ├── sidepanel/
│   │   ├── index.html
│   │   ├── main.tsx               # React 入口
│   │   ├── App.tsx                # 根组件（Tabs: TTS / Notes）
│   │   ├── components/
│   │   │   ├── TtsPanel.tsx       # TTS 控制面板
│   │   │   └── NotesPanel.tsx     # 笔记列表面板
│   │   └── hooks/
│   │       ├── useTts.ts          # TTS 状态 hook
│   │       └── useNotes.ts        # 笔记状态 hook
│   ├── shared/
│   │   ├── messages.ts            # 所有消息类型定义
│   │   └── storage.ts             # chrome.storage 类型化封装
│   └── utils/
│       ├── tokenizer.ts           # 中英文句子切分
│       └── hash.ts                # 段落锚点哈希
├── src/test-setup.ts              # Vitest 全局 chrome mock
└── src/**/*.test.ts               # 各模块单元测试
```

---

## Task 1: 项目脚手架

**Files:**
- Create: `extension/` 目录（项目根）
- Create: `manifest.json`
- Create: `vite.config.ts`
- Create: `package.json`（由 npm init 生成后修改）
- Create: `tsconfig.json`
- Create: `tailwind.config.js`
- Create: `src/sidepanel/index.html`
- Create: `src/sidepanel/main.tsx`
- Create: `src/sidepanel/App.tsx`
- Create: `src/background/service-worker.ts`（空壳）
- Create: `src/content/index.ts`（空壳）

**Interfaces:**
- Produces: 可在 Chrome 加载的开发版 Extension，Side Panel 显示 "Hello"

- [ ] **Step 1: 创建项目**

```bash
cd /Users/jianchengsun/app/pdf-adjust-editter
npm create vite@latest extension -- --template react-ts
cd extension
```

- [ ] **Step 2: 安装依赖**

```bash
npm install
npm install -D @crxjs/vite-plugin@beta
npm install -D tailwindcss postcss autoprefixer
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
npx tailwindcss init -p
```

- [ ] **Step 3: 写 manifest.json**

删除 `public/` 目录下所有文件，在项目根创建 `manifest.json`：

```json
{
  "manifest_version": 3,
  "name": "ReadFlow",
  "version": "0.1.0",
  "description": "TTS 朗读 + 内联笔记",
  "permissions": ["storage", "activeTab", "scripting", "sidePanel", "tts"],
  "side_panel": {
    "default_path": "src/sidepanel/index.html"
  },
  "background": {
    "service_worker": "src/background/service-worker.ts",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/index.ts"],
      "css": ["src/content/notes.css"]
    }
  ],
  "action": {
    "default_title": "ReadFlow"
  }
}
```

- [ ] **Step 4: 配置 vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
})
```

- [ ] **Step 5: 配置 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 6: 配置 tailwind.config.js**

```js
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 7: 配置 Vitest（在 vite.config.ts 中追加）**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 8: 创建 chrome mock（src/test-setup.ts）**

```ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

global.chrome = {
  tts: {
    speak: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    isSpeaking: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn() },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
} as unknown as typeof chrome
```

- [ ] **Step 9: 创建 Side Panel 入口文件**

`src/sidepanel/index.html`:
```html
<!doctype html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <title>ReadFlow</title>
    <script type="module" src="./main.tsx"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

`src/sidepanel/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

`src/sidepanel/App.tsx`:
```tsx
export default function App() {
  return <div className="p-4 text-gray-800">ReadFlow 加载中...</div>
}
```

新建 `src/sidepanel/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 10: 创建空壳入口**

`src/background/service-worker.ts`:
```ts
// TTS service worker — 后续 Task 5 实现
```

`src/content/index.ts`:
```ts
// Content script 入口 — 后续 Task 3/4/6 实现
```

`src/content/notes.css`:
```css
/* 笔记块样式 — 后续 Task 4 实现 */
```

- [ ] **Step 11: 验证构建**

```bash
npm run build
```

预期：`dist/` 目录生成，无报错。

- [ ] **Step 12: 在 Chrome 加载扩展**

1. 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」，选择 `dist/` 目录
4. 点击扩展图标，Side Panel 应显示 "ReadFlow 加载中..."

- [ ] **Step 13: Commit**

```bash
git init
git add .
git commit -m "feat: chrome extension project scaffold"
```

---

## Task 2: 共享类型 + 工具函数

**Files:**
- Create: `src/shared/messages.ts`
- Create: `src/shared/storage.ts`
- Create: `src/utils/tokenizer.ts`
- Create: `src/utils/tokenizer.test.ts`
- Create: `src/utils/hash.ts`
- Create: `src/utils/hash.test.ts`

**Interfaces:**
- Produces:
  - `tokenizeSentences(text: string): string[]`
  - `tokenizeParagraphs(paragraphs: ParagraphData[]): SentenceIndex[]`
  - `hashAnchor(text: string): Promise<string>`
  - `Message` 联合类型
  - `Note`, `NoteRecord`, `TtsState` 类型
  - `getNotes(url: string): Promise<NoteRecord>`
  - `saveNote(url: string, note: Note): Promise<void>`
  - `deleteNote(url: string, noteId: string): Promise<void>`

- [ ] **Step 1: 写消息类型（src/shared/messages.ts）**

```ts
export interface SentenceIndex {
  paragraphIndex: number
  sentenceIndex: number
  globalIndex: number
  text: string
}

export interface Note {
  id: string
  content: string
  anchorHash: string
  anchorText: string
  createdAt: number
}

export type NoteRecord = Record<string, Note>

export interface TtsState {
  playing: boolean
  currentGlobalIndex: number
  totalSentences: number
  currentText: string
  currentParagraphIndex: number
}

export type Message =
  | { type: 'TTS_START'; sentences: SentenceIndex[] }
  | { type: 'TTS_PAUSE' }
  | { type: 'TTS_RESUME' }
  | { type: 'TTS_NEXT_SENTENCE' }
  | { type: 'TTS_PREV_SENTENCE' }
  | { type: 'TTS_NEXT_PARAGRAPH' }
  | { type: 'TTS_PREV_PARAGRAPH' }
  | { type: 'TTS_JUMP_KEYWORD'; keyword: string }
  | { type: 'TTS_STOP' }
  | { type: 'TTS_HIGHLIGHT'; globalIndex: number; text: string }
  | { type: 'TTS_STATE_UPDATE'; state: TtsState }
  | { type: 'NOTES_GET' }
  | { type: 'NOTES_DATA'; notes: NoteRecord }
  | { type: 'NOTE_SAVE'; note: Note }
  | { type: 'NOTE_DELETE'; noteId: string }
```

- [ ] **Step 2: 写 storage 封装（src/shared/storage.ts）**

```ts
import type { Note, NoteRecord } from './messages'

const NOTES_KEY = 'notes'

type AllNotes = Record<string, NoteRecord>

export async function getNotes(url: string): Promise<NoteRecord> {
  const result = await chrome.storage.local.get(NOTES_KEY)
  const all = (result[NOTES_KEY] ?? {}) as AllNotes
  return all[url] ?? {}
}

export async function saveNote(url: string, note: Note): Promise<void> {
  const result = await chrome.storage.local.get(NOTES_KEY)
  const all = (result[NOTES_KEY] ?? {}) as AllNotes
  all[url] = { ...(all[url] ?? {}), [note.anchorHash]: note }
  await chrome.storage.local.set({ [NOTES_KEY]: all })
}

export async function deleteNote(url: string, noteId: string): Promise<void> {
  const result = await chrome.storage.local.get(NOTES_KEY)
  const all = (result[NOTES_KEY] ?? {}) as AllNotes
  if (all[url]) {
    const updated = Object.fromEntries(
      Object.entries(all[url]).filter(([, note]) => note.id !== noteId)
    )
    all[url] = updated
    await chrome.storage.local.set({ [NOTES_KEY]: all })
  }
}
```

- [ ] **Step 3: 写 tokenizer（src/utils/tokenizer.ts）**

```ts
import type { SentenceIndex } from '../shared/messages'

export function tokenizeSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？.!?]["'»]?)\s*/u)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

export interface ParagraphData {
  index: number
  text: string
}

export function buildSentenceIndex(paragraphs: ParagraphData[]): SentenceIndex[] {
  const result: SentenceIndex[] = []
  let globalIndex = 0
  for (const para of paragraphs) {
    const sentences = tokenizeSentences(para.text)
    for (let si = 0; si < sentences.length; si++) {
      result.push({
        paragraphIndex: para.index,
        sentenceIndex: si,
        globalIndex,
        text: sentences[si],
      })
      globalIndex++
    }
  }
  return result
}
```

- [ ] **Step 4: 写 tokenizer 测试（src/utils/tokenizer.test.ts）**

```ts
import { describe, it, expect } from 'vitest'
import { tokenizeSentences, buildSentenceIndex } from './tokenizer'

describe('tokenizeSentences', () => {
  it('splits Chinese sentences by 。', () => {
    const result = tokenizeSentences('第一句。第二句。第三句。')
    expect(result).toEqual(['第一句。', '第二句。', '第三句。'])
  })

  it('splits English sentences by .', () => {
    const result = tokenizeSentences('First sentence. Second sentence. Third.')
    expect(result).toEqual(['First sentence.', 'Second sentence.', 'Third.'])
  })

  it('handles ！ and ？', () => {
    const result = tokenizeSentences('真的吗？是的！好的。')
    expect(result).toEqual(['真的吗？', '是的！', '好的。'])
  })

  it('filters empty strings', () => {
    const result = tokenizeSentences('  ')
    expect(result).toEqual([])
  })
})

describe('buildSentenceIndex', () => {
  it('assigns correct globalIndex across paragraphs', () => {
    const paras = [
      { index: 0, text: '第一段第一句。第一段第二句。' },
      { index: 1, text: '第二段第一句。' },
    ]
    const idx = buildSentenceIndex(paras)
    expect(idx).toHaveLength(3)
    expect(idx[0]).toMatchObject({ paragraphIndex: 0, sentenceIndex: 0, globalIndex: 0 })
    expect(idx[1]).toMatchObject({ paragraphIndex: 0, sentenceIndex: 1, globalIndex: 1 })
    expect(idx[2]).toMatchObject({ paragraphIndex: 1, sentenceIndex: 0, globalIndex: 2 })
  })
})
```

- [ ] **Step 5: 运行测试，确认通过**

```bash
npm run test -- tokenizer
```

预期：2 个 describe 块全部 PASS。

- [ ] **Step 6: 写 hash 工具（src/utils/hash.ts）**

```ts
export async function hashAnchor(text: string): Promise<string> {
  const normalized = text.trim().slice(0, 80)
  const encoder = new TextEncoder()
  const data = encoder.encode(normalized)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  const bytes = Array.from(new Uint8Array(buffer))
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}
```

- [ ] **Step 7: 写 hash 测试（src/utils/hash.test.ts）**

```ts
import { describe, it, expect } from 'vitest'
import { hashAnchor } from './hash'

describe('hashAnchor', () => {
  it('returns a 16-char hex string', async () => {
    const result = await hashAnchor('这是一段测试文字')
    expect(result).toHaveLength(16)
    expect(result).toMatch(/^[0-9a-f]{16}$/)
  })

  it('same input returns same hash', async () => {
    const a = await hashAnchor('相同的文字')
    const b = await hashAnchor('相同的文字')
    expect(a).toBe(b)
  })

  it('different inputs return different hashes', async () => {
    const a = await hashAnchor('文字A')
    const b = await hashAnchor('文字B')
    expect(a).not.toBe(b)
  })

  it('trims to 80 chars before hashing', async () => {
    const short = 'a'.repeat(80)
    const long = 'a'.repeat(80) + 'extra'
    expect(await hashAnchor(short)).toBe(await hashAnchor(long))
  })
})
```

- [ ] **Step 8: 运行测试，确认通过**

```bash
npm run test -- hash
```

预期：全部 PASS。

- [ ] **Step 9: Commit**

```bash
git add src/shared src/utils src/test-setup.ts
git commit -m "feat: shared types, tokenizer, and hash utility"
```

---

## Task 3: Content Script — 段落提取

**Files:**
- Create: `src/content/extractor.ts`
- Create: `src/content/extractor.test.ts`

**Interfaces:**
- Consumes: `buildSentenceIndex` from `src/utils/tokenizer.ts`
- Produces:
  - `extractParagraphs(): ParagraphElement[]`（其中 `ParagraphElement = { index: number; text: string; element: Element }`）
  - `buildPageIndex(): SentenceIndex[]`

- [ ] **Step 1: 写失败测试（src/content/extractor.test.ts）**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { extractParagraphs } from './extractor'

describe('extractParagraphs', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <article>
        <p>第一段内容，有足够长的文字。</p>
        <p>第二段内容，同样足够长。</p>
        <p>短</p>
      </article>
    `
  })

  it('extracts paragraphs with at least 10 characters', () => {
    const result = extractParagraphs()
    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('第一段内容，有足够长的文字。')
    expect(result[1].text).toBe('第二段内容，同样足够长。')
  })

  it('assigns sequential index', () => {
    const result = extractParagraphs()
    expect(result[0].index).toBe(0)
    expect(result[1].index).toBe(1)
  })

  it('includes the DOM element reference', () => {
    const result = extractParagraphs()
    expect(result[0].element.tagName).toBe('P')
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm run test -- extractor
```

预期：FAIL with "Cannot find module './extractor'"

- [ ] **Step 3: 实现 extractor（src/content/extractor.ts）**

```ts
import { buildSentenceIndex } from '../utils/tokenizer'
import type { SentenceIndex } from '../shared/messages'

export interface ParagraphElement {
  index: number
  text: string
  element: Element
}

const MIN_TEXT_LENGTH = 10
const PARAGRAPH_SELECTORS = 'p, li, blockquote, h1, h2, h3, h4, h5, h6'

export function extractParagraphs(): ParagraphElement[] {
  const elements = Array.from(document.querySelectorAll(PARAGRAPH_SELECTORS))
  const result: ParagraphElement[] = []
  let index = 0
  for (const el of elements) {
    const text = el.textContent?.trim() ?? ''
    if (text.length >= MIN_TEXT_LENGTH) {
      result.push({ index, text, element: el })
      index++
    }
  }
  return result
}

export function buildPageIndex(): SentenceIndex[] {
  const paragraphs = extractParagraphs()
  return buildSentenceIndex(paragraphs.map(p => ({ index: p.index, text: p.text })))
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
npm run test -- extractor
```

预期：全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/content/extractor.ts src/content/extractor.test.ts
git commit -m "feat: content script paragraph extractor"
```

---

## Task 4: Content Script — 内联笔记

**Files:**
- Create: `src/content/notes.ts`
- Create: `src/content/notes.test.ts`
- Modify: `src/content/notes.css`

**Interfaces:**
- Consumes: `hashAnchor` from `src/utils/hash.ts`; `getNotes`, `saveNote`, `deleteNote` from `src/shared/storage.ts`; `extractParagraphs` from `./extractor.ts`
- Produces:
  - `initNotes(): Promise<void>`（页面加载时调用，还原已有笔记）
  - `attachNoteButtons(): void`（给每个段落挂载悬停按钮）

- [ ] **Step 1: 写失败测试（src/content/notes.test.ts）**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { insertNoteBlock, removeNoteBlock } from './notes'

describe('insertNoteBlock', () => {
  beforeEach(() => {
    document.body.innerHTML = `<p id="para">这是一段足够长的测试段落文字。</p>`
  })

  it('inserts a note block after the target element', () => {
    const para = document.getElementById('para')!
    insertNoteBlock(para, 'abc123', '初始内容')
    const note = document.querySelector('.note-block')
    expect(note).not.toBeNull()
    expect(note!.nextElementSibling).toBeNull()
    expect(para.nextElementSibling).toBe(note)
  })

  it('sets data-anchor on the note block', () => {
    const para = document.getElementById('para')!
    insertNoteBlock(para, 'abc123', '')
    const note = document.querySelector('.note-block')
    expect(note?.getAttribute('data-anchor')).toBe('abc123')
  })
})

describe('removeNoteBlock', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <p id="para">段落文字足够长。</p>
      <div class="note-block" data-anchor="abc123" data-note-id="id1">
        <div class="note-content" contenteditable="true">笔记内容</div>
      </div>
    `
  })

  it('removes the note block from DOM', () => {
    removeNoteBlock('abc123')
    expect(document.querySelector('.note-block')).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm run test -- notes
```

预期：FAIL

- [ ] **Step 3: 实现 notes.ts（src/content/notes.ts）**

```ts
import { hashAnchor } from '../utils/hash'
import { getNotes, saveNote, deleteNote } from '../shared/storage'
import { extractParagraphs } from './extractor'

const CURRENT_URL = window.location.href

export function insertNoteBlock(
  targetElement: Element,
  anchorHash: string,
  initialContent: string
): HTMLElement {
  const block = document.createElement('div')
  block.className = 'note-block'
  block.setAttribute('data-anchor', anchorHash)

  const contentEl = document.createElement('div')
  contentEl.className = 'note-content'
  contentEl.setAttribute('contenteditable', 'true')
  contentEl.innerHTML = initialContent || ''
  contentEl.setAttribute('placeholder', '在这里输入笔记...')

  const deleteBtn = document.createElement('button')
  deleteBtn.className = 'note-delete-btn'
  deleteBtn.textContent = '✕'
  deleteBtn.addEventListener('click', async () => {
    const noteId = block.getAttribute('data-note-id')
    if (noteId && confirm('删除这条笔记？')) {
      await deleteNote(CURRENT_URL, noteId)
      block.remove()
    }
  })

  contentEl.addEventListener('blur', async () => {
    const noteId = block.getAttribute('data-note-id') || crypto.randomUUID()
    block.setAttribute('data-note-id', noteId)
    const anchorText = targetElement.textContent?.trim().slice(0, 80) ?? ''
    await saveNote(CURRENT_URL, {
      id: noteId,
      content: contentEl.innerHTML,
      anchorHash,
      anchorText,
      createdAt: Date.now(),
    })
  })

  block.appendChild(deleteBtn)
  block.appendChild(contentEl)
  targetElement.insertAdjacentElement('afterend', block)
  return block
}

export function removeNoteBlock(anchorHash: string): void {
  const block = document.querySelector(`.note-block[data-anchor="${anchorHash}"]`)
  block?.remove()
}

export function attachNoteButtons(): void {
  const paragraphs = extractParagraphs()
  for (const para of paragraphs) {
    const btn = document.createElement('button')
    btn.className = 'note-add-btn'
    btn.textContent = '+ 笔记'
    btn.addEventListener('click', async () => {
      const existing = para.element.nextElementSibling
      if (existing?.classList.contains('note-block')) return
      const hash = await hashAnchor(para.text)
      const block = insertNoteBlock(para.element, hash, '')
      block.querySelector<HTMLElement>('.note-content')?.focus()
    })

    const wrapper = document.createElement('div')
    wrapper.className = 'note-btn-wrapper'
    wrapper.appendChild(btn)
    para.element.addEventListener('mouseenter', () => {
      const next = para.element.nextElementSibling
      if (!next?.classList.contains('note-block')) {
        para.element.insertAdjacentElement('afterend', wrapper)
      }
    })
    para.element.addEventListener('mouseleave', (e) => {
      if (!wrapper.contains(e.relatedTarget as Node)) {
        wrapper.remove()
      }
    })
  }
}

export async function initNotes(): Promise<void> {
  const notes = await getNotes(CURRENT_URL)
  const paragraphs = extractParagraphs()

  for (const para of paragraphs) {
    const hash = await hashAnchor(para.text)
    const note = notes[hash]
    if (note) {
      const block = insertNoteBlock(para.element, hash, note.content)
      block.setAttribute('data-note-id', note.id)
    }
  }
}
```

- [ ] **Step 4: 写 notes.css（src/content/notes.css）**

```css
.note-block {
  position: relative;
  margin: 8px 0;
  padding: 10px 36px 10px 12px;
  background-color: #fffbeb;
  border-left: 3px solid #f59e0b;
  border-radius: 4px;
  font-family: inherit;
  font-size: inherit;
}

.note-content {
  min-height: 40px;
  outline: none;
  color: #374151;
  line-height: 1.6;
  white-space: pre-wrap;
}

.note-content:empty::before {
  content: attr(placeholder);
  color: #9ca3af;
  pointer-events: none;
}

.note-delete-btn {
  position: absolute;
  top: 6px;
  right: 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  font-size: 14px;
  line-height: 1;
  padding: 2px 4px;
}

.note-delete-btn:hover {
  color: #ef4444;
}

.note-btn-wrapper {
  display: flex;
  justify-content: flex-start;
  margin: 2px 0;
}

.note-add-btn {
  background: none;
  border: 1px dashed #d1d5db;
  border-radius: 4px;
  color: #9ca3af;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 8px;
}

.note-add-btn:hover {
  border-color: #f59e0b;
  color: #f59e0b;
}

.tts-highlight {
  background-color: #fef08a;
  border-radius: 2px;
}
```

- [ ] **Step 5: 运行测试，确认通过**

```bash
npm run test -- notes
```

预期：全部 PASS。

- [ ] **Step 6: Commit**

```bash
git add src/content/notes.ts src/content/notes.test.ts src/content/notes.css
git commit -m "feat: inline notes DOM insertion and persistence"
```

---

## Task 5: Service Worker — TTS 引擎

**Files:**
- Create: `src/background/service-worker.ts`（覆盖空壳）
- Create: `src/background/service-worker.test.ts`

**Interfaces:**
- Consumes: `Message`, `TtsState`, `SentenceIndex` from `src/shared/messages.ts`
- Produces: 响应以下消息的 Service Worker
  - `TTS_START` → 开始朗读，广播 `TTS_HIGHLIGHT`
  - `TTS_PAUSE` / `TTS_RESUME` / `TTS_STOP`
  - `TTS_NEXT_SENTENCE` / `TTS_PREV_SENTENCE`
  - `TTS_NEXT_PARAGRAPH` / `TTS_PREV_PARAGRAPH`
  - `TTS_JUMP_KEYWORD` → 定位第一个匹配句

- [ ] **Step 1: 写失败测试（src/background/service-worker.test.ts）**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  handleMessage,
  buildTtsState,
  findKeywordIndex,
} from './service-worker'
import type { SentenceIndex } from '../shared/messages'

const mockSentences: SentenceIndex[] = [
  { paragraphIndex: 0, sentenceIndex: 0, globalIndex: 0, text: '第一段第一句。' },
  { paragraphIndex: 0, sentenceIndex: 1, globalIndex: 1, text: '第一段第二句。' },
  { paragraphIndex: 1, sentenceIndex: 0, globalIndex: 2, text: '第二段关键词出现。' },
  { paragraphIndex: 1, sentenceIndex: 1, globalIndex: 3, text: '第二段第二句。' },
]

describe('findKeywordIndex', () => {
  it('returns globalIndex of first matching sentence', () => {
    expect(findKeywordIndex(mockSentences, '关键词')).toBe(2)
  })

  it('returns -1 when keyword not found', () => {
    expect(findKeywordIndex(mockSentences, '不存在')).toBe(-1)
  })
})

describe('buildTtsState', () => {
  it('builds correct state for current index', () => {
    const state = buildTtsState(mockSentences, 1)
    expect(state.currentGlobalIndex).toBe(1)
    expect(state.currentText).toBe('第一段第二句。')
    expect(state.currentParagraphIndex).toBe(0)
    expect(state.totalSentences).toBe(4)
    expect(state.playing).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm run test -- service-worker
```

预期：FAIL

- [ ] **Step 3: 实现 service-worker.ts**

```ts
import type { Message, SentenceIndex, TtsState } from '../shared/messages'

let sentences: SentenceIndex[] = []
let currentIndex = 0
let isPlaying = false

export function findKeywordIndex(list: SentenceIndex[], keyword: string): number {
  const idx = list.findIndex(s => s.text.includes(keyword))
  return idx >= 0 ? list[idx].globalIndex : -1
}

export function buildTtsState(list: SentenceIndex[], index: number): TtsState {
  const current = list[index]
  return {
    playing: true,
    currentGlobalIndex: index,
    totalSentences: list.length,
    currentText: current?.text ?? '',
    currentParagraphIndex: current?.paragraphIndex ?? 0,
  }
}

function broadcastToTab(message: Message): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id
    if (tabId) chrome.tabs.sendMessage(tabId, message)
  })
}

function speakCurrent(): void {
  if (!sentences[currentIndex]) return
  const { text } = sentences[currentIndex]

  chrome.tts.speak(text, {
    onEvent: (event) => {
      if (event.type === 'end') {
        if (currentIndex < sentences.length - 1) {
          currentIndex++
          speakCurrent()
        } else {
          isPlaying = false
        }
      }
    },
  })

  broadcastToTab({ type: 'TTS_HIGHLIGHT', globalIndex: currentIndex, text })
  broadcastToTab({ type: 'TTS_STATE_UPDATE', state: buildTtsState(sentences, currentIndex) })
}

export function handleMessage(
  message: Message,
  sendResponse: (r: unknown) => void
): void {
  switch (message.type) {
    case 'TTS_START':
      sentences = message.sentences
      currentIndex = 0
      isPlaying = true
      chrome.tts.stop()
      speakCurrent()
      break

    case 'TTS_PAUSE':
      chrome.tts.pause()
      isPlaying = false
      break

    case 'TTS_RESUME':
      chrome.tts.resume()
      isPlaying = true
      break

    case 'TTS_STOP':
      chrome.tts.stop()
      isPlaying = false
      sentences = []
      break

    case 'TTS_NEXT_SENTENCE':
      if (currentIndex < sentences.length - 1) {
        chrome.tts.stop()
        currentIndex++
        speakCurrent()
      }
      break

    case 'TTS_PREV_SENTENCE':
      if (currentIndex > 0) {
        chrome.tts.stop()
        currentIndex--
        speakCurrent()
      }
      break

    case 'TTS_NEXT_PARAGRAPH': {
      const currentPara = sentences[currentIndex]?.paragraphIndex ?? 0
      const next = sentences.find(s => s.paragraphIndex > currentPara)
      if (next) {
        chrome.tts.stop()
        currentIndex = next.globalIndex
        speakCurrent()
      }
      break
    }

    case 'TTS_PREV_PARAGRAPH': {
      const curPara = sentences[currentIndex]?.paragraphIndex ?? 0
      const prevPara = curPara > 0 ? curPara - 1 : 0
      const prev = sentences.find(s => s.paragraphIndex === prevPara)
      if (prev) {
        chrome.tts.stop()
        currentIndex = prev.globalIndex
        speakCurrent()
      }
      break
    }

    case 'TTS_JUMP_KEYWORD': {
      const idx = findKeywordIndex(sentences, message.keyword)
      if (idx >= 0) {
        chrome.tts.stop()
        currentIndex = idx
        speakCurrent()
      }
      sendResponse({ found: idx >= 0 })
      break
    }
  }
}

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  handleMessage(message, sendResponse)
  return true
})
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
npm run test -- service-worker
```

预期：全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/background/
git commit -m "feat: TTS engine in service worker with sentence navigation"
```

---

## Task 6: Content Script — TTS 高亮 + 入口串联

**Files:**
- Create: `src/content/highlighter.ts`
- Modify: `src/content/index.ts`（串联所有 content 模块）

**Interfaces:**
- Consumes: `extractParagraphs` from `./extractor.ts`; `Message` from `src/shared/messages.ts`
- Produces:
  - `highlightSentence(globalIndex: number): void`
  - `clearHighlight(): void`
  - Content script 完整初始化（笔记还原 + 按钮挂载 + 高亮监听）

- [ ] **Step 1: 实现 highlighter.ts**

```ts
import type { ParagraphElement } from './extractor'

let currentHighlightEl: Element | null = null

export function highlightSentence(
  paragraphs: ParagraphElement[],
  globalIndex: number,
  allGlobalIndexBase: number[]
): void {
  clearHighlight()

  const paraIndex = allGlobalIndexBase[globalIndex]
  const para = paragraphs.find(p => p.index === paraIndex)
  if (!para) return

  const wrapper = document.createElement('mark')
  wrapper.className = 'tts-highlight'
  currentHighlightEl = wrapper

  para.element.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export function clearHighlight(): void {
  document.querySelectorAll('.tts-highlight').forEach(el => {
    const parent = el.parentNode
    if (parent) {
      parent.replaceChild(document.createTextNode(el.textContent ?? ''), el)
      parent.normalize()
    }
  })
  currentHighlightEl = null
}
```

- [ ] **Step 2: 串联 Content Script 入口（src/content/index.ts）**

```ts
import { initNotes, attachNoteButtons } from './notes'
import { extractParagraphs, buildPageIndex } from './extractor'
import { clearHighlight } from './highlighter'
import type { Message } from '../shared/messages'

async function init() {
  await initNotes()
  attachNoteButtons()

  chrome.runtime.onMessage.addListener((message: Message) => {
    if (message.type === 'TTS_HIGHLIGHT') {
      clearHighlight()
      const paragraphs = extractParagraphs()
      const targetPara = paragraphs[
        // 找到包含该 globalIndex 句子所在的段落
        Math.min(message.globalIndex, paragraphs.length - 1)
      ]
      if (targetPara) {
        targetPara.element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        targetPara.element.classList.add('tts-highlight')
        setTimeout(() => targetPara.element.classList.remove('tts-highlight'), 3000)
      }
    }
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
```

- [ ] **Step 3: Commit**

```bash
git add src/content/highlighter.ts src/content/index.ts
git commit -m "feat: content script TTS highlighter and full init"
```

---

## Task 7: Side Panel — TTS 控制 UI

**Files:**
- Create: `src/sidepanel/hooks/useTts.ts`
- Create: `src/sidepanel/components/TtsPanel.tsx`

**Interfaces:**
- Consumes: `Message`, `TtsState`, `SentenceIndex` from `src/shared/messages.ts`; `buildPageIndex` via content script message
- Produces: `<TtsPanel />` 组件，含播放/暂停/导航/关键词跳转

- [ ] **Step 1: 实现 useTts hook（src/sidepanel/hooks/useTts.ts）**

```ts
import { useState, useCallback } from 'react'
import type { TtsState, Message } from '../../shared/messages'

const DEFAULT_STATE: TtsState = {
  playing: false,
  currentGlobalIndex: 0,
  totalSentences: 0,
  currentText: '',
  currentParagraphIndex: 0,
}

function sendToServiceWorker(message: Message): void {
  chrome.runtime.sendMessage(message)
}

function sendToActiveTab(message: Message): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id
    if (tabId) chrome.tabs.sendMessage(tabId, message)
  })
}

export function useTts() {
  const [state, setState] = useState<TtsState>(DEFAULT_STATE)

  const startReading = useCallback(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (!tabId) return
      chrome.tabs.sendMessage(tabId, { type: 'GET_SENTENCES' }, (sentences) => {
        if (sentences?.length) {
          sendToServiceWorker({ type: 'TTS_START', sentences })
          setState(prev => ({ ...prev, playing: true }))
        }
      })
    })
  }, [])

  const pause = useCallback(() => {
    sendToServiceWorker({ type: 'TTS_PAUSE' })
    setState(prev => ({ ...prev, playing: false }))
  }, [])

  const resume = useCallback(() => {
    sendToServiceWorker({ type: 'TTS_RESUME' })
    setState(prev => ({ ...prev, playing: true }))
  }, [])

  const nextSentence = useCallback(() => sendToServiceWorker({ type: 'TTS_NEXT_SENTENCE' }), [])
  const prevSentence = useCallback(() => sendToServiceWorker({ type: 'TTS_PREV_SENTENCE' }), [])
  const nextParagraph = useCallback(() => sendToServiceWorker({ type: 'TTS_NEXT_PARAGRAPH' }), [])
  const prevParagraph = useCallback(() => sendToServiceWorker({ type: 'TTS_PREV_PARAGRAPH' }), [])

  const jumpToKeyword = useCallback((keyword: string) => {
    sendToServiceWorker({ type: 'TTS_JUMP_KEYWORD', keyword })
  }, [])

  // 监听 Service Worker 状态更新
  useState(() => {
    const listener = (message: Message) => {
      if (message.type === 'TTS_STATE_UPDATE') {
        setState(message.state)
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  })

  return {
    state,
    startReading,
    pause,
    resume,
    nextSentence,
    prevSentence,
    nextParagraph,
    prevParagraph,
    jumpToKeyword,
  }
}
```

- [ ] **Step 2: 实现 TtsPanel 组件（src/sidepanel/components/TtsPanel.tsx）**

```tsx
import { useState } from 'react'
import { useTts } from '../hooks/useTts'

export default function TtsPanel() {
  const {
    state,
    startReading,
    pause,
    resume,
    nextSentence,
    prevSentence,
    nextParagraph,
    prevParagraph,
    jumpToKeyword,
  } = useTts()

  const [keyword, setKeyword] = useState('')

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* 进度 */}
      <div className="rounded-lg bg-gray-50 p-3">
        <p className="text-xs text-gray-400 mb-1">
          {state.playing
            ? `正在朗读第 ${state.currentParagraphIndex + 1} 段 · 第 ${state.currentGlobalIndex + 1} / ${state.totalSentences} 句`
            : '未开始'}
        </p>
        <p className="text-sm text-gray-700 line-clamp-2 min-h-[2.5rem]">
          {state.currentText || '点击「开始朗读」读取当前页面'}
        </p>
      </div>

      {/* 主控制 */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={prevParagraph}
          className="rounded p-2 text-gray-500 hover:bg-gray-100"
          title="上一段"
        >⏮段</button>
        <button
          onClick={prevSentence}
          className="rounded p-2 text-gray-500 hover:bg-gray-100"
          title="上一句"
        >⏮句</button>

        {state.playing ? (
          <button
            onClick={pause}
            className="rounded-full bg-amber-400 px-4 py-2 text-white hover:bg-amber-500"
          >⏸</button>
        ) : (
          <button
            onClick={state.totalSentences > 0 ? resume : startReading}
            className="rounded-full bg-amber-400 px-4 py-2 text-white hover:bg-amber-500"
          >{state.totalSentences > 0 ? '▶' : '开始朗读'}</button>
        )}

        <button
          onClick={nextSentence}
          className="rounded p-2 text-gray-500 hover:bg-gray-100"
          title="下一句"
        >⏭句</button>
        <button
          onClick={nextParagraph}
          className="rounded p-2 text-gray-500 hover:bg-gray-100"
          title="下一段"
        >⏭段</button>
      </div>

      {/* 关键词跳转 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') jumpToKeyword(keyword) }}
          placeholder="关键词跳转..."
          className="flex-1 rounded border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-amber-400"
        />
        <button
          onClick={() => jumpToKeyword(keyword)}
          className="rounded bg-amber-400 px-3 py-1.5 text-sm text-white hover:bg-amber-500"
        >跳转</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/sidepanel/hooks/useTts.ts src/sidepanel/components/TtsPanel.tsx
git commit -m "feat: TTS controls panel in side panel"
```

---

## Task 8: Side Panel — 笔记列表 UI

**Files:**
- Create: `src/sidepanel/hooks/useNotes.ts`
- Create: `src/sidepanel/components/NotesPanel.tsx`

**Interfaces:**
- Consumes: `getNotes` from `src/shared/storage.ts`; `NoteRecord` from `src/shared/messages.ts`
- Produces: `<NotesPanel />` 展示当前页所有笔记，点击滚动至对应段落

- [ ] **Step 1: 实现 useNotes hook（src/sidepanel/hooks/useNotes.ts）**

```ts
import { useState, useEffect } from 'react'
import type { NoteRecord, Note } from '../../shared/messages'
import { getNotes } from '../../shared/storage'

export function useNotes() {
  const [notes, setNotes] = useState<NoteRecord>({})
  const [currentUrl, setCurrentUrl] = useState('')

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const url = tabs[0]?.url ?? ''
      setCurrentUrl(url)
      const stored = await getNotes(url)
      setNotes(stored)
    })
  }, [])

  const scrollToNote = (note: Note) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (tabId) {
        chrome.tabs.sendMessage(tabId, {
          type: 'SCROLL_TO_ANCHOR',
          anchorHash: note.anchorHash,
        })
      }
    })
  }

  const notesArray = Object.values(notes).sort((a, b) => a.createdAt - b.createdAt)

  return { notes: notesArray, currentUrl, scrollToNote }
}
```

- [ ] **Step 2: 实现 NotesPanel 组件（src/sidepanel/components/NotesPanel.tsx）**

```tsx
import { useNotes } from '../hooks/useNotes'

export default function NotesPanel() {
  const { notes, scrollToNote } = useNotes()

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 text-gray-400">
        <p className="text-2xl">📝</p>
        <p className="text-sm">本页暂无笔记</p>
        <p className="text-xs text-center">将鼠标悬停在段落上，点击「+ 笔记」添加</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <p className="text-xs text-gray-400">本页笔记（{notes.length} 条）</p>
      {notes.map(note => (
        <button
          key={note.id}
          onClick={() => scrollToNote(note)}
          className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-left hover:border-amber-300"
        >
          <p className="text-xs text-amber-600 mb-1 truncate">
            {note.anchorText.slice(0, 30)}...
          </p>
          <p
            className="text-sm text-gray-700 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: note.content }}
          />
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: 在 content/index.ts 中处理 SCROLL_TO_ANCHOR 消息**

在 `src/content/index.ts` 的 `onMessage` 监听器中追加：

```ts
if (message.type === 'SCROLL_TO_ANCHOR') {
  const block = document.querySelector(
    `.note-block[data-anchor="${message.anchorHash}"]`
  )
  block?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
```

同时在 `src/shared/messages.ts` 中追加消息类型：
```ts
| { type: 'SCROLL_TO_ANCHOR'; anchorHash: string }
| { type: 'GET_SENTENCES' }  // Content script 返回页面句子索引
```

在 `src/content/index.ts` 中处理 `GET_SENTENCES`：
```ts
if (message.type === 'GET_SENTENCES') {
  sendResponse(buildPageIndex())
  return true
}
```

- [ ] **Step 4: Commit**

```bash
git add src/sidepanel/hooks/useNotes.ts src/sidepanel/components/NotesPanel.tsx src/content/index.ts src/shared/messages.ts
git commit -m "feat: notes list panel and scroll-to-note"
```

---

## Task 9: Side Panel App Shell — 串联所有模块

**Files:**
- Modify: `src/sidepanel/App.tsx`（覆盖占位内容）

**Interfaces:**
- Consumes: `<TtsPanel />`, `<NotesPanel />`
- Produces: 完整可用的 Side Panel，含 TTS / 笔记两个 Tab

- [ ] **Step 1: 实现 App.tsx**

```tsx
import { useState } from 'react'
import TtsPanel from './components/TtsPanel'
import NotesPanel from './components/NotesPanel'

type Tab = 'tts' | 'notes'

export default function App() {
  const [tab, setTab] = useState<Tab>('tts')

  return (
    <div className="flex h-screen flex-col bg-white text-sm">
      {/* Header */}
      <div className="flex items-center border-b border-gray-100 px-4 py-3">
        <span className="font-semibold text-gray-800">ReadFlow</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setTab('tts')}
          className={`flex-1 py-2 text-sm transition-colors ${
            tab === 'tts'
              ? 'border-b-2 border-amber-400 font-medium text-amber-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🔊 朗读
        </button>
        <button
          onClick={() => setTab('notes')}
          className={`flex-1 py-2 text-sm transition-colors ${
            tab === 'notes'
              ? 'border-b-2 border-amber-400 font-medium text-amber-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📝 笔记
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'tts' ? <TtsPanel /> : <NotesPanel />}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 构建并重新加载扩展**

```bash
npm run build
```

在 `chrome://extensions/` 点击「重新加载」按钮。

- [ ] **Step 3: 端到端测试**

打开任意中文文章（如 sspai.com 或任意新闻页），执行以下检查：

1. 点击 Chrome 工具栏的 ReadFlow 图标 → Side Panel 打开，显示两个 Tab
2. 点击「开始朗读」→ 页面段落开始被高亮，系统 TTS 开始朗读
3. 点击「⏭句」→ 跳到下一句
4. 在关键词框输入页面中存在的词，点击「跳转」→ 从该词所在句开始朗读
5. 悬停段落 → 出现「+ 笔记」按钮
6. 点击「+ 笔记」，输入内容，点击其他地方 → 笔记块保留，黄色背景
7. 切换到「笔记」Tab → 看到刚才添加的笔记
8. 点击笔记列表项 → 页面滚动到对应位置
9. 刷新页面 → 笔记自动还原

- [ ] **Step 4: 运行全部测试**

```bash
npm run test
```

预期：全部 PASS，无 FAIL。

- [ ] **Step 5: 最终 Commit**

```bash
git add src/sidepanel/App.tsx
git commit -m "feat: side panel app shell with TTS and notes tabs"
git tag v0.1.0
```

---

## 自检：规格覆盖

| 规格要求 | 对应 Task |
|---------|---------|
| TTS 按句/段导航 | Task 5, 7 |
| TTS 关键词跳转 | Task 5, 7 |
| TTS 当前句高亮 | Task 6 |
| 网页内联笔记插入 | Task 4 |
| 笔记跨页面持久化 | Task 4 |
| 笔记锚点哈希策略 | Task 2, 4 |
| 笔记还原 | Task 4 |
| Side Panel 主界面 | Task 7, 8, 9 |
| chrome.tts（非 Web Speech API） | Task 5 |
| chrome.storage.local | Task 2 |
| React + TypeScript + Vite + CRXJS | Task 1 |
| Tailwind CSS | Task 1, 7, 8, 9 |
