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
