import { hashAnchor } from '../utils/hash'
import { getNotes, saveNote, deleteNote } from '../shared/storage'
import { extractParagraphs } from './extractor'

const CURRENT_URL = window.location.href

export function insertNoteBlock(
  targetElement: Element,
  anchorHash: string,
  initialContent: string
): HTMLElement {
  const block = document.createElement('div')
  block.className = 'note-block'
  block.setAttribute('data-anchor', anchorHash)

  const contentEl = document.createElement('div')
  contentEl.className = 'note-content'
  contentEl.setAttribute('contenteditable', 'true')
  // Use textContent instead of innerHTML to prevent XSS
  contentEl.textContent = initialContent || ''
  contentEl.setAttribute('placeholder', '在这里输入笔记...')

  const deleteBtn = document.createElement('button')
  deleteBtn.className = 'note-delete-btn'
  deleteBtn.textContent = '✕'
  deleteBtn.addEventListener('click', async () => {
    const noteId = block.getAttribute('data-note-id')
    if (noteId && confirm('删除这条笔记？')) {
      try {
        await deleteNote(CURRENT_URL, noteId)
        block.remove()
      } catch (e) {
        console.error('Failed to delete note:', e)
      }
    }
  })

  contentEl.addEventListener('blur', async () => {
    const noteId = block.getAttribute('data-note-id') || crypto.randomUUID()
    block.setAttribute('data-note-id', noteId)
    const anchorText = targetElement.textContent?.trim().slice(0, 80) ?? ''
    await saveNote(CURRENT_URL, {
      id: noteId,
      // Use textContent to read and persist — plain text only, no XSS risk
      content: contentEl.textContent ?? '',
      anchorHash,
      anchorText,
      createdAt: Date.now(),
    })
  })

  block.appendChild(deleteBtn)
  block.appendChild(contentEl)
  targetElement.insertAdjacentElement('afterend', block)
  return block
}

export function removeNoteBlock(anchorHash: string): void {
  const block = document.querySelector(`.note-block[data-anchor="${anchorHash}"]`)
  block?.remove()
}

export function attachNoteButtons(): void {
  const paragraphs = extractParagraphs()
  for (const para of paragraphs) {
    const btn = document.createElement('button')
    btn.className = 'note-add-btn'
    btn.textContent = '+ 笔记'
    btn.addEventListener('click', async () => {
      const existing = para.element.nextElementSibling
      if (existing?.classList.contains('note-block')) return
      const hash = await hashAnchor(para.text)
      const block = insertNoteBlock(para.element, hash, '')
      block.querySelector<HTMLElement>('.note-content')?.focus()
    })

    const wrapper = document.createElement('div')
    wrapper.className = 'note-btn-wrapper'
    wrapper.appendChild(btn)
    para.element.addEventListener('mouseenter', () => {
      const next = para.element.nextElementSibling
      if (!next?.classList.contains('note-block')) {
        if (!wrapper.parentNode) {
          para.element.insertAdjacentElement('afterend', wrapper)
        }
      }
    })
    para.element.addEventListener('mouseleave', (e) => {
      if (!wrapper.contains((e as MouseEvent).relatedTarget as Node)) {
        wrapper.remove()
      }
    })
  }
}

export async function initNotes(): Promise<void> {
  const notes = await getNotes(CURRENT_URL)
  const paragraphs = extractParagraphs()

  for (const para of paragraphs) {
    const hash = await hashAnchor(para.text)
    const note = notes[hash]
    if (note) {
      const block = insertNoteBlock(para.element, hash, note.content)
      block.setAttribute('data-note-id', note.id)
    }
  }
}
