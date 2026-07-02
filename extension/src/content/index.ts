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
