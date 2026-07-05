import { useState, useCallback, useEffect, useRef } from 'react'
import type { TtsState, Message, VoicePref, SentenceIndex } from '../../shared/messages'

export type { VoicePref }

export const EDGE_VOICES: { name: string; label: string; gender: 'male' | 'female' }[] = [
  { name: 'zh-CN-YunxiNeural',    label: '云希 YunXi — 男声（推荐）',   gender: 'male' },
  { name: 'zh-CN-YunyangNeural',  label: '云扬 YunYang — 男声（新闻）', gender: 'male' },
  { name: 'zh-CN-YunjianNeural',  label: '云健 YunJian — 男声（故事）', gender: 'male' },
  { name: 'zh-CN-XiaoXiaoNeural', label: '晓晓 XiaoXiao — 女声（推荐）', gender: 'female' },
  { name: 'zh-CN-XiaoyiNeural',   label: '晓伊 XiaoYi — 女声',         gender: 'female' },
]

const DEFAULT_STATE: TtsState = {
  playing: false,
  currentGlobalIndex: 0,
  totalSentences: 0,
  currentText: '',
  currentParagraphIndex: 0,
}

function sendToServiceWorker(message: Message): void {
  chrome.runtime.sendMessage(message).catch(() => {})
}

export function useTts() {
  const [state, setState] = useState<TtsState>(DEFAULT_STATE)
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])
  const [previewText, setPreviewText] = useState('')
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voicePref, setVoicePrefState] = useState<VoicePref | null>(null)
  const [speed, setSpeedState] = useState<number>(1)

  // Discover system voices — zh (curated) + en (curated)
  useEffect(() => {
    const PINNED_ZH = new Set(['Tingting', 'Meijia'])
    const PINNED_EN = new Set(['Samantha', 'Alex', 'Tom', 'Fiona', 'Karen'])
    const load = () => {
      const all = window.speechSynthesis.getVoices()
      const zh = all.filter(v => v.lang.startsWith('zh') && (v.name.startsWith('Google') || PINNED_ZH.has(v.name)))
      const en = all.filter(v => v.lang.startsWith('en') && (v.name.startsWith('Google') || PINNED_EN.has(v.name)))
      setSystemVoices([...zh, ...en])
    }
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  // Load saved preferences
  useEffect(() => {
    chrome.storage.local.get(['rf_voice', 'rf_speed'], (result) => {
      if (result.rf_voice) setVoicePrefState(result.rf_voice as VoicePref)
      if (result.rf_speed) setSpeedState(result.rf_speed as number)
    })
  }, [])

  // Fetch initial preview text
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (!tabId) return
      chrome.tabs.sendMessage(tabId, { type: 'GET_PREVIEW' }, (response) => {
        if (chrome.runtime.lastError) return
        if (response?.text) setPreviewText(response.text)
      })
    })
  }, [])

  // Listen for runtime messages from service worker / offscreen
  useEffect(() => {
    const listener = (message: Message) => {
      if (message.type === 'TTS_STATE_UPDATE') setState(message.state)
      else if (message.type === 'PREVIEW_UPDATE') setPreviewText(message.text)
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  const setSpeed = useCallback((s: number) => {
    setSpeedState(s)
    chrome.storage.local.set({ rf_speed: s })
    if (stateRef.current.totalSentences > 0) {
      sendToServiceWorker({ type: 'TTS_JUMP_TO_INDEX', globalIndex: stateRef.current.currentGlobalIndex })
      setState(prev => ({ ...prev, playing: true }))
    }
  }, [])

  const setVoice = useCallback((pref: VoicePref) => {
    setVoicePrefState(pref)
    chrome.storage.local.set({ rf_voice: pref })
    const s = stateRef.current
    if (s.totalSentences > 0) {
      sendToServiceWorker({ type: 'TTS_JUMP_TO_INDEX', globalIndex: s.currentGlobalIndex })
      setState(prev => ({ ...prev, playing: true }))
    }
  }, [])

  const startReading = useCallback(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      const tabId = tab?.id
      if (!tabId) return

      // PDF viewer tab: read sentences from session storage cache
      const extOrigin = chrome.runtime.getURL('').replace(/\/$/, '')
      const tabUrl = tab.url ?? ''
      if (tabUrl.startsWith(extOrigin) && tabUrl.includes('pdf-viewer')) {
        const pdfUrl = new URL(tabUrl).searchParams.get('url') ?? ''
        chrome.storage.session.get(`pdf:${pdfUrl}`, (result) => {
          if (chrome.runtime.lastError) return
          const data = result[`pdf:${pdfUrl}`] as { sentences: SentenceIndex[]; lang: string; startGlobalIndex?: number } | undefined
          if (data?.sentences?.length) {
            sendToServiceWorker({ type: 'TTS_START', sentences: data.sentences, lang: data.lang, startGlobalIndex: data.startGlobalIndex ?? 0 })
            setState(prev => ({ ...prev, playing: true }))
          }
        })
        return
      }

      // Regular web page
      chrome.tabs.sendMessage(tabId, { type: 'GET_SENTENCES' }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[ReadFlow] Content script not ready — please refresh the page.')
          return
        }
        const sentences = response?.sentences ?? response
        const lang = response?.lang
        const startGlobalIndex = response?.startGlobalIndex ?? 0
        if (sentences?.length) {
          sendToServiceWorker({ type: 'TTS_START', sentences, lang, startGlobalIndex })
          setState(prev => ({ ...prev, playing: true }))
        }
      })
    })
  }, [])

  const pause = useCallback(() => {
    sendToServiceWorker({ type: 'TTS_PAUSE' })
    setState(prev => ({ ...prev, playing: false }))
  }, [])

  const resume = useCallback(() => {
    sendToServiceWorker({ type: 'TTS_RESUME' })
    setState(prev => ({ ...prev, playing: true }))
  }, [])

  const nextSentence = useCallback(() => sendToServiceWorker({ type: 'TTS_NEXT_SENTENCE' }), [])
  const prevSentence = useCallback(() => sendToServiceWorker({ type: 'TTS_PREV_SENTENCE' }), [])
  const nextParagraph = useCallback(() => sendToServiceWorker({ type: 'TTS_NEXT_PARAGRAPH' }), [])
  const prevParagraph = useCallback(() => sendToServiceWorker({ type: 'TTS_PREV_PARAGRAPH' }), [])

  return {
    state,
    previewText,
    systemVoices,
    voicePref,
    setVoice,
    speed,
    setSpeed,
    startReading,
    pause,
    resume,
    nextSentence,
    prevSentence,
    nextParagraph,
    prevParagraph,
  }
}
