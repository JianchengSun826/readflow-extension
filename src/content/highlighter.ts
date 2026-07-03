import type { ParagraphElement } from './extractor'

export function highlightSentence(para: ParagraphElement): void {
  clearHighlight()
  para.element.classList.add('tts-highlight')
  para.element.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export function clearHighlight(): void {
  document.querySelectorAll('.tts-highlight').forEach(el => {
    el.classList.remove('tts-highlight')
  })
}
