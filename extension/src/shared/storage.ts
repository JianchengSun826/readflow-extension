import type { Note, NoteRecord } from './messages'

const NOTES_KEY = 'notes'

type AllNotes = Record<string, NoteRecord>

export async function getNotes(url: string): Promise<NoteRecord> {
  const result = await chrome.storage.local.get(NOTES_KEY)
  const all = (result[NOTES_KEY] ?? {}) as AllNotes
  return all[url] ?? {}
}

export async function saveNote(url: string, note: Note): Promise<void> {
  const result = await chrome.storage.local.get(NOTES_KEY)
  const all = (result[NOTES_KEY] ?? {}) as AllNotes
  all[url] = { ...(all[url] ?? {}), [note.anchorHash]: note }
  await chrome.storage.local.set({ [NOTES_KEY]: all })
}

export async function deleteNote(url: string, noteId: string): Promise<void> {
  const result = await chrome.storage.local.get(NOTES_KEY)
  const all = (result[NOTES_KEY] ?? {}) as AllNotes
  if (all[url]) {
    const updated = Object.fromEntries(
      Object.entries(all[url]).filter(([, note]) => note.id !== noteId)
    )
    all[url] = updated
    await chrome.storage.local.set({ [NOTES_KEY]: all })
  }
}
