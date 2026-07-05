import type { Message, SentenceIndex, TtsState, VoicePref } from '../shared/messages'

let sentences: SentenceIndex[] = []
let currentIndex = 0
let currentLang = 'en'

export function findKeywordIndex(list: SentenceIndex[], keyword: string): number {
  const idx = list.findIndex(s => s.text.includes(keyword))
  return idx >= 0 ? list[idx].globalIndex : -1
}

export function buildTtsState(list: SentenceIndex[], index: number, playing = true): TtsState {
  const current = list[index]
  return {
    playing,
    currentGlobalIndex: index,
    totalSentences: list.length,
    currentText: current?.text ?? '',
    currentParagraphIndex: current?.paragraphIndex ?? 0,
  }
}

// --- Offscreen document ---
// Promise-lock so concurrent calls never trigger createDocument twice
let _offscreenReady: Promise<void> | null = null

function setupOffscreen(): Promise<void> {
  if (!_offscreenReady) {
    _offscreenReady = (async () => {
      if (await chrome.offscreen.hasDocument()) return
      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL('src/offscreen/offscreen.html'),
        reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
        justification: 'Text-to-speech audio playback',
      })
    })()
    // Reset on failure so the next call can retry
    _offscreenReady.catch((e) => {
      console.error('[ReadFlow SW] setupOffscreen failed:', e)
      _offscreenReady = null
    })
  }
  return _offscreenReady
}

// --- Messaging ---

function sendToTab(message: Message): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id
    if (tabId) chrome.tabs.sendMessage(tabId, message)
  })
}

// Broadcast to extension pages (side panel + offscreen document)
function sendToExtension(message: Message): void {
  chrome.runtime.sendMessage(message).catch(() => {})
}

// Route TTS command to offscreen document (creates it if needed)
async function sendToOffscreen(message: Message): Promise<void> {
  await setupOffscreen()
  sendToExtension(message)
}

// speakCurrent does NOT pre-cancel — the offscreen document calls stopCurrentSpeech()
// at the start of each speakChinese/speakDefault, so a pre-cancel is redundant and
// introduces a parallel-setupOffscreen race that silently swallows the first sentence.
async function speakCurrent(): Promise<void> {
  if (!sentences[currentIndex]) return
  const { text } = sentences[currentIndex]
  // Read fresh from storage each time — in-memory voicePref can be stale after
  // service worker restart or if storage change fires after speakCurrent is called.
  const stored = await chrome.storage.local.get(['rf_voice', 'rf_speed'])
  const currentVoicePref = (stored.rf_voice as VoicePref) ?? null
  const currentSpeed = (stored.rf_speed as number) ?? 1
  console.log('[SW] speakCurrent | voicePref from storage:', JSON.stringify(currentVoicePref), '| lang:', currentLang)
  try {
    await sendToOffscreen({ type: 'SPEAK_SENTENCE', text, lang: currentLang, voicePref: currentVoicePref, speed: currentSpeed })
  } catch (e) {
    console.error('[ReadFlow SW] speakCurrent failed:', e)
    return
  }
  sendToTab({ type: 'TTS_HIGHLIGHT', globalIndex: currentIndex, text })
  sendToExtension({ type: 'TTS_HIGHLIGHT', globalIndex: currentIndex, text })
  sendToExtension({ type: 'TTS_STATE_UPDATE', state: buildTtsState(sentences, currentIndex) })
}

export function handleMessage(
  message: Message,
  _sendResponse: (r: unknown) => void
): void {
  switch (message.type) {
    case 'TTS_START':
      sentences = message.sentences
      currentLang = message.lang ?? 'en'
      currentIndex = message.startGlobalIndex ?? 0
      speakCurrent()
      break

    case 'TTS_SENTENCE_ENDED':
      if (currentIndex < sentences.length - 1) {
        currentIndex++
        speakCurrent()
      } else {
        sendToExtension({ type: 'TTS_STATE_UPDATE', state: buildTtsState(sentences, currentIndex, false) })
      }
      break

    case 'TTS_PAUSE':
      sendToOffscreen({ type: 'SPEECH_PAUSE' })
      sendToExtension({ type: 'TTS_STATE_UPDATE', state: buildTtsState(sentences, currentIndex, false) })
      break

    case 'TTS_RESUME':
      sendToOffscreen({ type: 'SPEECH_RESUME' })
      sendToExtension({ type: 'TTS_STATE_UPDATE', state: buildTtsState(sentences, currentIndex, true) })
      break

    case 'TTS_STOP':
      sendToOffscreen({ type: 'SPEECH_CANCEL' })
      sendToExtension({ type: 'TTS_STATE_UPDATE', state: buildTtsState(sentences, currentIndex, false) })
      sentences = []
      break

    case 'TTS_NEXT_SENTENCE':
      if (currentIndex < sentences.length - 1) {
        currentIndex++
        speakCurrent()
      }
      break

    case 'TTS_PREV_SENTENCE':
      if (currentIndex > 0) {
        currentIndex--
        speakCurrent()
      }
      break

    case 'TTS_NEXT_PARAGRAPH': {
      const currentPara = sentences[currentIndex]?.paragraphIndex ?? 0
      const next = sentences.find(s => s.paragraphIndex > currentPara)
      if (next) {
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
        currentIndex = prev.globalIndex
        speakCurrent()
      }
      break
    }

    case 'TTS_JUMP_TO_INDEX':
      currentIndex = message.globalIndex
      speakCurrent()
      break

    case 'DEBUG_LOG':
      console.log('[offscreen →]', message.text)
      break
  }
}

chrome.runtime.onMessage.addListener((message: Message, _sender, _sendResponse) => {
  handleMessage(message, _sendResponse)
})

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error)
})

// Redirect PDF navigations to the built-in PDF viewer
function isPdfUrl(url: string): boolean {
  try { return new URL(url).pathname.toLowerCase().endsWith('.pdf') }
  catch { return false }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  const url = changeInfo.url
  if (!url) return
  const extOrigin = chrome.runtime.getURL('')
  if (isPdfUrl(url) && !url.startsWith(extOrigin)) {
    const viewerUrl = extOrigin + 'src/pdf-viewer/index.html?url=' + encodeURIComponent(url)
    chrome.tabs.update(tabId, { url: viewerUrl }).catch(() => {})
  }
})
