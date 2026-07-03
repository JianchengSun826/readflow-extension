import './notes.css'
import { initNotes, attachNoteButtons } from './notes'
import { extractParagraphs, buildPageIndex, getFirstVisibleIndex } from './extractor'
import { highlightSentence } from './highlighter'
import type { Message, SentenceIndex } from '../shared/messages'

let cachedSentenceIndex: SentenceIndex[] = []

function detectPageLanguage(): string {
  const lang = document.documentElement.lang
  if (lang) return lang
  const meta = document.querySelector<HTMLMetaElement>('meta[http-equiv="content-language"]')
  if (meta?.content) return meta.content
  return 'en'
}

async function init() {
  await initNotes()
  attachNoteButtons()
  cachedSentenceIndex = buildPageIndex()

  chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
    if (message.type === 'TTS_HIGHLIGHT') {
      const sentence = cachedSentenceIndex[message.globalIndex]
      if (sentence) {
        const paragraphs = extractParagraphs()
        const para = paragraphs[sentence.paragraphIndex]
        if (para) highlightSentence(para)
      }
    }
    if (message.type === 'GET_SENTENCES') {
      const paragraphs = extractParagraphs()
      const sentences = buildPageIndex()
      const lang = detectPageLanguage()
      const startIndex = getFirstVisibleIndex(paragraphs)
      const firstSentenceIndex = sentences.findIndex(s => s.paragraphIndex >= startIndex)
      sendResponse({ sentences, lang, startGlobalIndex: firstSentenceIndex >= 0 ? firstSentenceIndex : 0 })
      return true
    }
    if (message.type === 'SCROLL_TO_ANCHOR') {
      const block = document.querySelector(
        `.note-block[data-anchor="${message.anchorHash}"]`
      )
      block?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })

  document.addEventListener('click', (e) => {
    const target = (e.target as Element).closest('p, li, blockquote, h1, h2, h3, h4, h5, h6')
    if (!target) return
    const paragraphs = extractParagraphs()
    const para = paragraphs.find(p => p.element === target)
    if (!para) return
    const sentences = cachedSentenceIndex
    const sentenceIdx = sentences.findIndex(s => s.paragraphIndex === para.index)
    if (sentenceIdx >= 0) {
      chrome.runtime.sendMessage({ type: 'TTS_JUMP_TO_INDEX', globalIndex: sentenceIdx })
    }
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
