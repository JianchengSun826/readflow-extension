import type { Message, SentenceIndex, TtsState } from '../shared/messages'

let sentences: SentenceIndex[] = []
let currentIndex = 0

export function findKeywordIndex(list: SentenceIndex[], keyword: string): number {
  const idx = list.findIndex(s => s.text.includes(keyword))
  return idx >= 0 ? list[idx].globalIndex : -1
}

export function buildTtsState(list: SentenceIndex[], index: number): TtsState {
  const current = list[index]
  return {
    playing: true,
    currentGlobalIndex: index,
    totalSentences: list.length,
    currentText: current?.text ?? '',
    currentParagraphIndex: current?.paragraphIndex ?? 0,
  }
}

function broadcastToTab(message: Message): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id
    if (tabId) chrome.tabs.sendMessage(tabId, message)
  })
}

function speakCurrent(): void {
  if (!sentences[currentIndex]) return
  const { text } = sentences[currentIndex]

  chrome.tts.speak(text, {
    onEvent: (event) => {
      if (event.type === 'end') {
        if (currentIndex < sentences.length - 1) {
          currentIndex++
          speakCurrent()
        }
      }
    },
  })

  broadcastToTab({ type: 'TTS_HIGHLIGHT', globalIndex: currentIndex, text })
  broadcastToTab({ type: 'TTS_STATE_UPDATE', state: buildTtsState(sentences, currentIndex) })
}

export function handleMessage(
  message: Message,
  sendResponse: (r: unknown) => void
): void {
  switch (message.type) {
    case 'TTS_START':
      sentences = message.sentences
      currentIndex = 0
      chrome.tts.stop()
      speakCurrent()
      break

    case 'TTS_PAUSE':
      chrome.tts.pause()
      break

    case 'TTS_RESUME':
      chrome.tts.resume()
      break

    case 'TTS_STOP':
      chrome.tts.stop()
      sentences = []
      break

    case 'TTS_NEXT_SENTENCE':
      if (currentIndex < sentences.length - 1) {
        chrome.tts.stop()
        currentIndex++
        speakCurrent()
      }
      break

    case 'TTS_PREV_SENTENCE':
      if (currentIndex > 0) {
        chrome.tts.stop()
        currentIndex--
        speakCurrent()
      }
      break

    case 'TTS_NEXT_PARAGRAPH': {
      const currentPara = sentences[currentIndex]?.paragraphIndex ?? 0
      const next = sentences.find(s => s.paragraphIndex > currentPara)
      if (next) {
        chrome.tts.stop()
        currentIndex = next.globalIndex
        speakCurrent()
      }
      break
    }

    case 'TTS_PREV_PARAGRAPH': {
      const curPara = sentences[currentIndex]?.paragraphIndex ?? 0
      const prevPara = curPara > 0 ? curPara - 1 : 0
      const prev = sentences.find(s => s.paragraphIndex === prevPara)
      if (prev) {
        chrome.tts.stop()
        currentIndex = prev.globalIndex
        speakCurrent()
      }
      break
    }

    case 'TTS_JUMP_KEYWORD': {
      const idx = findKeywordIndex(sentences, message.keyword)
      if (idx >= 0) {
        chrome.tts.stop()
        currentIndex = idx
        speakCurrent()
      }
      sendResponse({ found: idx >= 0 })
      break
    }
  }
}

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  handleMessage(message, sendResponse)
  return true
})
