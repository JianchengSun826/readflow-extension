import * as pdfjsLib from 'pdfjs-dist'
import { buildSentenceIndex } from '../utils/tokenizer'
import type { Message, SentenceIndex } from '../shared/messages'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href

let sentences: SentenceIndex[] = []

async function extractFromPdf(url: string): Promise<void> {
  const pdf = await pdfjsLib.getDocument({ url }).promise
  const paras: { index: number; text: string }[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const content = await (await pdf.getPage(pageNum)).getTextContent()

    // Group text items into lines by Y coordinate (snap to 3px grid)
    const lineMap = new Map<number, string[]>()
    for (const raw of content.items) {
      const item = raw as { str: string; transform: number[] }
      if (!item.str?.trim()) continue
      const bucket = Math.round(item.transform[5] / 3) * 3
      if (!lineMap.has(bucket)) lineMap.set(bucket, [])
      lineMap.get(bucket)!.push(item.str)
    }

    // Sort lines top→bottom (PDF Y axis is inverted: larger Y = higher on page)
    const lines = [...lineMap.entries()]
      .sort(([a], [b]) => b - a)
      .map(([y, texts]) => ({ y, text: texts.join('').trim() }))
      .filter(l => l.text)

    // Merge lines into paragraphs; flush on large Y gap or sentence end
    let current = ''
    let prevY: number | null = null

    const flush = () => {
      const t = current.trim()
      if (t.length >= 10) paras.push({ index: paras.length, text: t })
      current = ''
    }

    for (const { y, text } of lines) {
      if (prevY !== null) {
        const gap = Math.abs(prevY - y)
        const isSentenceEnd = /[。！？.!?]["'»]?$/.test(current)
        if (gap > 18 || (isSentenceEnd && gap > 8)) {
          flush()
        } else if (current) {
          const needSpace = /[a-zA-Z0-9,;]$/.test(current) && /^[a-zA-Z]/.test(text)
          current += needSpace ? ' ' : ''
        }
      }
      current += text
      prevY = y
    }
    flush()
  }

  const lang = /[一-鿿]/.test(paras[0]?.text ?? '') ? 'zh-CN' : 'en'
  sentences = buildSentenceIndex(paras)

  // Cache sentences for side panel access
  const pdfUrl = new URLSearchParams(location.search).get('url') ?? ''
  await chrome.storage.session.set({ [`pdf:${pdfUrl}`]: { sentences, lang } })

  render(paras)
}

function render(paras: { index: number; text: string }[]): void {
  const content = document.getElementById('content')!
  content.replaceChildren()
  for (const { index, text } of paras) {
    const p = document.createElement('p')
    p.className = 'rf-para'
    p.dataset.paraIndex = String(index)
    p.textContent = text
    content.appendChild(p)
  }
}

// Persist startGlobalIndex to session storage so side panel can read it
async function saveStartIndex(globalIndex: number): Promise<void> {
  const pdfUrl = new URLSearchParams(location.search).get('url') ?? ''
  const key = `pdf:${pdfUrl}`
  const cached = await chrome.storage.session.get(key)
  const existing = cached[key] as Record<string, unknown> | undefined
  if (existing) {
    await chrome.storage.session.set({ [key]: { ...existing, startGlobalIndex: globalIndex } })
  }
}

// Click: jump to paragraph (if TTS running) and save as start position
document.addEventListener('click', (e) => {
  const target = (e.target as Element).closest('p.rf-para')
  if (!target) return
  const paraIndex = parseInt((target as HTMLElement).dataset.paraIndex ?? '-1', 10)
  if (paraIndex < 0) return
  const idx = sentences.findIndex(s => s.paragraphIndex === paraIndex)
  if (idx < 0) return
  saveStartIndex(idx)
  chrome.runtime.sendMessage({ type: 'TTS_JUMP_TO_INDEX', globalIndex: idx }).catch(() => {})
})

// Selection: save anchor paragraph as start position
document.addEventListener('selectionchange', () => {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed) return
  const anchor = sel.anchorNode
  const anchorEl = (anchor?.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor as Element | null)
  const para = anchorEl?.closest('p.rf-para')
  if (!para) return
  const paraIndex = parseInt((para as HTMLElement).dataset.paraIndex ?? '-1', 10)
  if (paraIndex < 0) return
  const idx = sentences.findIndex(s => s.paragraphIndex === paraIndex)
  if (idx >= 0) saveStartIndex(idx)
})

// Highlight active sentence from TTS
chrome.runtime.onMessage.addListener((message: Message) => {
  if (message.type === 'TTS_HIGHLIGHT') {
    const s = sentences[message.globalIndex]
    document.querySelectorAll('p.rf-active').forEach(el => el.classList.remove('rf-active'))
    if (s) {
      const el = document.querySelector<HTMLElement>(`p[data-para-index="${s.paragraphIndex}"]`)
      el?.classList.add('rf-active')
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
})

// Init
const params = new URLSearchParams(location.search)
const pdfUrl = params.get('url')
if (pdfUrl) {
  const filename = decodeURIComponent(pdfUrl.split('/').pop()?.split('?')[0] ?? 'PDF 文件')
  document.title = filename
  const filenameEl = document.getElementById('filename')
  if (filenameEl) filenameEl.textContent = filename

  extractFromPdf(pdfUrl).catch((e: unknown) => {
    const status = document.getElementById('status')
    if (status) status.textContent = `加载失败：${String(e)}`
  })
}
