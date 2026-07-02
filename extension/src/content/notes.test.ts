import { describe, it, expect, beforeEach, vi } from 'vitest'
import { insertNoteBlock, removeNoteBlock } from './notes'

describe('insertNoteBlock', () => {
  beforeEach(() => {
    document.body.innerHTML = `<p id="para">这是一段足够长的测试段落文字。</p>`
  })

  it('inserts a note block after the target element', () => {
    const para = document.getElementById('para')!
    insertNoteBlock(para, 'abc123', '初始内容')
    const note = document.querySelector('.note-block')
    expect(note).not.toBeNull()
    expect(note!.nextElementSibling).toBeNull()
    expect(para.nextElementSibling).toBe(note)
  })

  it('sets data-anchor on the note block', () => {
    const para = document.getElementById('para')!
    insertNoteBlock(para, 'abc123', '')
    const note = document.querySelector('.note-block')
    expect(note?.getAttribute('data-anchor')).toBe('abc123')
  })
})

describe('removeNoteBlock', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <p id="para">段落文字足够长。</p>
      <div class="note-block" data-anchor="abc123" data-note-id="id1">
        <div class="note-content" contenteditable="true">笔记内容</div>
      </div>
    `
  })

  it('removes the note block from DOM', () => {
    removeNoteBlock('abc123')
    expect(document.querySelector('.note-block')).toBeNull()
  })
})
