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

export { buildSentenceIndex as tokenizeParagraphs }
