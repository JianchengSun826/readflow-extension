export interface SentenceIndex {
  paragraphIndex: number
  sentenceIndex: number
  globalIndex: number
  text: string
}

export interface TtsState {
  playing: boolean
  currentGlobalIndex: number
  totalSentences: number
  currentText: string
  currentParagraphIndex: number
}

export interface VoicePref { type: 'system' | 'edge'; name: string }

export type Message =
  | { type: 'TTS_START'; sentences: SentenceIndex[]; lang?: string; startGlobalIndex?: number }
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
  | { type: 'TTS_SENTENCE_ENDED' }
  | { type: 'GET_SENTENCES' }
  | { type: 'TTS_JUMP_TO_INDEX'; globalIndex: number }
  | { type: 'SPEAK_SENTENCE'; text: string; lang: string; voicePref: VoicePref | null; speed: number }
  | { type: 'SPEECH_PAUSE' }
  | { type: 'SPEECH_RESUME' }
  | { type: 'SPEECH_CANCEL' }
  | { type: 'GET_PREVIEW' }
  | { type: 'PREVIEW_UPDATE'; text: string }
  | { type: 'DEBUG_LOG'; text: string }
