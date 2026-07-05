import { extractParagraphs, buildPageIndex, getFirstVisibleIndex } from './extractor'
import { highlightSentence } from './highlighter'
import type { Message, SentenceIndex } from '../shared/messages'

let cachedSentenceIndex: SentenceIndex[] = []

function detectPageLanguage(): string {
  return document.documentElement.lang
    || document.querySelector<HTMLMetaElement>('meta[http-equiv="content-language"]')?.content
    || 'en'
}

async function init() {
  cachedSentenceIndex = buildPageIndex()

  chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
    if (message.type === 'TTS_HIGHLIGHT') {
      const sentence = cachedSentenceIndex[message.globalIndex]
      if (sentence) {
        const para = extractParagraphs()[sentence.paragraphIndex]
        if (para) highlightSentence(para)
      }
      return
    }

    if (message.type === 'GET_SENTENCES') {
      const paragraphs = extractParagraphs()
      const sentences = buildPageIndex()
      cachedSentenceIndex = sentences
      const lang = detectPageLanguage()
      let startIndex = getFirstVisibleIndex(paragraphs)

      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const anchor = sel.anchorNode
        const anchorEl = anchor?.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor as Element | null
        if (anchorEl) {
          const matched = paragraphs.find(p => p.element === anchorEl || p.element.contains(anchorEl))
          if (matched) startIndex = matched.index
        }
      }

      const firstSentenceIndex = sentences.findIndex(s => s.paragraphIndex >= startIndex)
      sendResponse({ sentences, lang, startGlobalIndex: firstSentenceIndex >= 0 ? firstSentenceIndex : 0 })
      return true
    }

    if (message.type === 'GET_PREVIEW') {
      const paragraphs = extractParagraphs()
      const sentences = buildPageIndex()
      const startIdx = getFirstVisibleIndex(paragraphs)
      const first = sentences.find(s => s.paragraphIndex >= startIdx)
      sendResponse({ text: first?.text ?? '' })
      return true
    }

  })

  // Push preview text on selection change (debounced)
  let selTimer: ReturnType<typeof setTimeout> | null = null
  document.addEventListener('selectionchange', () => {
    if (selTimer) clearTimeout(selTimer)
    selTimer = setTimeout(() => {
      const sel = window.getSelection()
      if (sel && !sel.isCollapsed) {
        const text = sel.toString().trim()
        if (text) { chrome.runtime.sendMessage({ type: 'PREVIEW_UPDATE', text }).catch(() => {}); return }
      }
      const paragraphs = extractParagraphs()
      const sentences = buildPageIndex()
      const startIdx = getFirstVisibleIndex(paragraphs)
      const first = sentences.find(s => s.paragraphIndex >= startIdx)
      if (first) chrome.runtime.sendMessage({ type: 'PREVIEW_UPDATE', text: first.text }).catch(() => {})
    }, 250)
  })

  // Click-to-jump while TTS is active
  document.addEventListener('click', (e) => {
    if (cachedSentenceIndex.length === 0) return
    const target = (e.target as Element).closest('p, li, blockquote, h1, h2, h3, h4, h5, h6')
    if (!target) return
    const para = extractParagraphs().find(p => p.element === target)
    if (!para) return
    const idx = cachedSentenceIndex.findIndex(s => s.paragraphIndex === para.index)
    if (idx >= 0) chrome.runtime.sendMessage({ type: 'TTS_JUMP_TO_INDEX', globalIndex: idx })
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
