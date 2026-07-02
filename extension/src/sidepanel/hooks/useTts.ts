import { useState, useCallback, useEffect } from 'react'
import type { TtsState, Message } from '../../shared/messages'

const DEFAULT_STATE: TtsState = {
  playing: false,
  currentGlobalIndex: 0,
  totalSentences: 0,
  currentText: '',
  currentParagraphIndex: 0,
}

function sendToServiceWorker(message: Message): void {
  chrome.runtime.sendMessage(message)
}

export function useTts() {
  const [state, setState] = useState<TtsState>(DEFAULT_STATE)

  const startReading = useCallback(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (!tabId) return
      chrome.tabs.sendMessage(tabId, { type: 'GET_SENTENCES' }, (sentences) => {
        if (sentences?.length) {
          sendToServiceWorker({ type: 'TTS_START', sentences })
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

  const jumpToKeyword = useCallback((keyword: string) => {
    sendToServiceWorker({ type: 'TTS_JUMP_KEYWORD', keyword })
  }, [])

  useEffect(() => {
    const listener = (message: Message) => {
      if (message.type === 'TTS_STATE_UPDATE') {
        setState(message.state)
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  return {
    state,
    startReading,
    pause,
    resume,
    nextSentence,
    prevSentence,
    nextParagraph,
    prevParagraph,
    jumpToKeyword,
  }
}
