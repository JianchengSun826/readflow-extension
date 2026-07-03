import type { Note, NoteRecord } from './messages'

const NOTES_KEY = 'notes'

type AllNotes = Record<string, NoteRecord>

export async function getNotes(url: string): Promise<NoteRecord> {
  const result = await chrome.storage.local.get(NOTES_KEY)
  const all = (result[NOTES_KEY] ?? {}) as AllNotes
  return all[url] ?? {}
}

// NoteRecord key = anchorHash（按段落快速查找），note.id 用于删除时的值过滤
export async function saveNote(url: string, note: Note): Promise<void> {
  const result = await chrome.storage.local.get(NOTES_KEY)
  const all = (result[NOTES_KEY] ?? {}) as AllNotes
  all[url] = { ...(all[url] ?? {}), [note.anchorHash]: note }
  await chrome.storage.local.set({ [NOTES_KEY]: all })
}

export async function deleteNote(url: string, anchorHash: string): Promise<void> {
  const result = await chrome.storage.local.get(NOTES_KEY)
  const all = (result[NOTES_KEY] ?? {}) as Record<string, NoteRecord>
  if (all[url]) {
    delete all[url][anchorHash]
    await chrome.storage.local.set({ [NOTES_KEY]: all })
  }
}
