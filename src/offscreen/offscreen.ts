import type { Message } from '../shared/messages'

let currentAudio: HTMLAudioElement | null = null

// --- Helpers ---

function digitsToZh(text: string): string {
  const map: Record<string, string> = {
    '0': '零', '1': '一', '2': '二', '3': '三', '4': '四',
    '5': '五', '6': '六', '7': '七', '8': '八', '9': '九',
  }
  return text.replace(/\d/g, d => map[d] ?? d)
}

function stopCurrentSpeech(): void {
  if (currentAudio) { currentAudio.pause(); currentAudio.src = ''; currentAudio = null }
  window.speechSynthesis.cancel()
}

function doneSpeaking(): void {
  chrome.runtime.sendMessage({ type: 'TTS_SENTENCE_ENDED' }).catch(() => {})
}

function swLog(text: string): void {
  console.log('[offscreen]', text)
  chrome.runtime.sendMessage({ type: 'DEBUG_LOG', text }).catch(() => {})
}

function playBlob(buf: ArrayBuffer, speed: number): void {
  const blobUrl = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }))
  const audio = new Audio(blobUrl)
  audio.playbackRate = speed
  currentAudio = audio
  const cleanup = () => { URL.revokeObjectURL(blobUrl); if (currentAudio === audio) currentAudio = null }
  audio.onended = () => { cleanup(); doneSpeaking() }
  audio.onerror = () => { cleanup(); doneSpeaking() }
  audio.play().catch(() => { cleanup(); doneSpeaking() })
}

// --- TTS engines ---

function speakWithSystemVoice(text: string, voice: SpeechSynthesisVoice, speed: number): void {
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.voice = voice
  utter.lang = voice.lang
  utter.rate = speed
  utter.onend = doneSpeaking
  utter.onerror = (e) => { if (e.error !== 'interrupted') doneSpeaking() }
  window.speechSynthesis.speak(utter)
}

function speakGoogle(text: string, speed: number): void {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(digitsToZh(text).slice(0, 200))}&tl=zh-CN&client=tw-ob`
  fetch(url)
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer() })
    .then(buf => playBlob(buf, speed))
    .catch(e => { console.error('[ReadFlow offscreen] Google TTS failed', e); doneSpeaking() })
}

function getZhVoices(): SpeechSynthesisVoice[] {
  const PINNED = new Set(['Tingting', 'Meijia'])
  return window.speechSynthesis.getVoices().filter(v =>
    v.lang.startsWith('zh') && (v.name.startsWith('Google') || PINNED.has(v.name))
  )
}

// --- Main entry ---

function speak(text: string, lang: string, voicePref: { type: 'system'; name: string } | null, speed: number): void {
  stopCurrentSpeech()

  // If a specific voice is selected, try it first regardless of language
  if (voicePref?.type === 'system') {
    const all = window.speechSynthesis.getVoices()
    const v = all.find(v => v.name === voicePref.name)
    if (v) {
      swLog(`→ Selected voice: ${v.name} (${v.lang})`)
      speakWithSystemVoice(text, v, speed)
      return
    }
  }

  // No selection or voice not found — language-appropriate fallback
  const isChinese = /[一-鿿㐀-䶿]/.test(text) || lang.startsWith('zh')
  swLog(`voicePref=${JSON.stringify(voicePref)} speed=${speed} | isChinese=${isChinese}`)
  if (isChinese) {
    const zhVoices = getZhVoices()
    if (zhVoices[0]) { speakWithSystemVoice(text, zhVoices[0], speed); return }
    speakGoogle(text, speed)
  } else {
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = lang
    utter.rate = speed
    utter.onend = doneSpeaking
    utter.onerror = (e) => { if (e.error !== 'interrupted') doneSpeaking() }
    window.speechSynthesis.speak(utter)
  }
}

// --- Message listener ---

chrome.runtime.onMessage.addListener((message: Message) => {
  if (message.type === 'SPEAK_SENTENCE') {
    const speed = message.speed ?? 1
    const vp = message.voicePref
    const pref = vp?.type === 'system' ? { type: 'system' as const, name: vp.name } : null
    speak(message.text, message.lang, pref, speed)
    return
  }
  if (message.type === 'SPEECH_PAUSE') {
    currentAudio?.pause()
    window.speechSynthesis.pause()
    return
  }
  if (message.type === 'SPEECH_RESUME') {
    currentAudio?.play()
    window.speechSynthesis.resume()
    return
  }
  if (message.type === 'SPEECH_CANCEL') {
    stopCurrentSpeech()
    return
  }
})
