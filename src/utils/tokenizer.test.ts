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
