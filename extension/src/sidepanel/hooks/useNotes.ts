import { useState, useEffect } from 'react'
import type { NoteRecord, Note } from '../../shared/messages'
import { getNotes } from '../../shared/storage'

export function useNotes() {
  const [notes, setNotes] = useState<NoteRecord>({})
  const [currentUrl, setCurrentUrl] = useState('')

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url ?? ''
      setCurrentUrl(url)
      getNotes(url).then(setNotes)
    })
  }, [])

  const scrollToNote = (note: Note) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (tabId) {
        chrome.tabs.sendMessage(tabId, {
          type: 'SCROLL_TO_ANCHOR',
          anchorHash: note.anchorHash,
        })
      }
    })
  }

  const notesArray = Object.values(notes).sort((a, b) => a.createdAt - b.createdAt)

  return { notes: notesArray, currentUrl, scrollToNote }
}
