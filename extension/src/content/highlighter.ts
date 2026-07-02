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
