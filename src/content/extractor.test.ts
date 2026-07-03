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
