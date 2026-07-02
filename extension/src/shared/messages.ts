export interface SentenceIndex {
  paragraphIndex: number
  sentenceIndex: number
  globalIndex: number
  text: string
}

export interface Note {
  id: string
  content: string
  anchorHash: string
  anchorText: string
  createdAt: number
}

export type NoteRecord = Record<string, Note>

export interface TtsState {
  playing: boolean
  currentGlobalIndex: number
  totalSentences: number
  currentText: string
  currentParagraphIndex: number
}

export type Message =
  | { type: 'TTS_START'; sentences: SentenceIndex[] }
  | { type: 'TTS_PAUSE' }
  | { type: 'TTS_RESUME' }
  | { type: 'TTS_NEXT_SENTENCE' }
  | { type: 'TTS_PREV_SENTENCE' }
  | { type: 'TTS_NEXT_PARAGRAPH' }
  | { type: 'TTS_PREV_PARAGRAPH' }
  | { type: 'TTS_JUMP_KEYWORD'; keyword: string }
  | { type: 'TTS_STOP' }
  | { type: 'TTS_HIGHLIGHT'; globalIndex: number; text: string }
  | { type: 'TTS_STATE_UPDATE'; state: TtsState }
  | { type: 'GET_SENTENCES' }
  | { type: 'SCROLL_TO_ANCHOR'; anchorHash: string }
  | { type: 'NOTES_GET' }
  | { type: 'NOTES_DATA'; notes: NoteRecord }
  | { type: 'NOTE_SAVE'; note: Note }
  | { type: 'NOTE_DELETE'; noteId: string }
