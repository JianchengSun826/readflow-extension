import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  handleMessage,
  buildTtsState,
  findKeywordIndex,
} from './service-worker'
import type { SentenceIndex } from '../shared/messages'

const mockSentences: SentenceIndex[] = [
  { paragraphIndex: 0, sentenceIndex: 0, globalIndex: 0, text: '第一段第一句。' },
  { paragraphIndex: 0, sentenceIndex: 1, globalIndex: 1, text: '第一段第二句。' },
  { paragraphIndex: 1, sentenceIndex: 0, globalIndex: 2, text: '第二段关键词出现。' },
  { paragraphIndex: 1, sentenceIndex: 1, globalIndex: 3, text: '第二段第二句。' },
]

describe('findKeywordIndex', () => {
  it('returns globalIndex of first matching sentence', () => {
    expect(findKeywordIndex(mockSentences, '关键词')).toBe(2)
  })

  it('returns -1 when keyword not found', () => {
    expect(findKeywordIndex(mockSentences, '不存在')).toBe(-1)
  })
})

describe('buildTtsState', () => {
  it('builds correct state for current index', () => {
    const state = buildTtsState(mockSentences, 1)
    expect(state.currentGlobalIndex).toBe(1)
    expect(state.currentText).toBe('第一段第二句。')
    expect(state.currentParagraphIndex).toBe(0)
    expect(state.totalSentences).toBe(4)
    expect(state.playing).toBe(true)
  })
})

describe('handleMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset chrome.tabs.query to call callback with a tab
    ;(chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation(
      (_query: unknown, cb: (tabs: chrome.tabs.Tab[]) => void) => {
        cb([{ id: 1 } as chrome.tabs.Tab])
      }
    )
    // Make chrome.tts.speak call the onEvent end callback synchronously for nav tests
    ;(chrome.tts.speak as ReturnType<typeof vi.fn>).mockImplementation(
      (_text: string, _opts?: object) => {
        // do nothing by default; individual tests can override
      }
    )
  })

  it('TTS_START: calls chrome.tts.stop then speaks first sentence', () => {
    handleMessage({ type: 'TTS_START', sentences: mockSentences }, vi.fn())
    expect(chrome.tts.stop).toHaveBeenCalled()
    expect(chrome.tts.speak).toHaveBeenCalledWith(
      '第一段第一句。',
      expect.objectContaining({ onEvent: expect.any(Function) })
    )
  })

  it('TTS_START: broadcasts TTS_HIGHLIGHT and TTS_STATE_UPDATE', () => {
    handleMessage({ type: 'TTS_START', sentences: mockSentences }, vi.fn())
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ type: 'TTS_HIGHLIGHT', globalIndex: 0 })
    )
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ type: 'TTS_STATE_UPDATE' })
    )
  })

  it('TTS_PAUSE: calls chrome.tts.pause', () => {
    handleMessage({ type: 'TTS_PAUSE' }, vi.fn())
    expect(chrome.tts.pause).toHaveBeenCalled()
  })

  it('TTS_RESUME: calls chrome.tts.resume', () => {
    handleMessage({ type: 'TTS_RESUME' }, vi.fn())
    expect(chrome.tts.resume).toHaveBeenCalled()
  })

  it('TTS_STOP: calls chrome.tts.stop', () => {
    handleMessage({ type: 'TTS_STOP' }, vi.fn())
    expect(chrome.tts.stop).toHaveBeenCalled()
  })

  it('TTS_NEXT_SENTENCE: stops current and speaks next', () => {
    // First start to set sentences state
    handleMessage({ type: 'TTS_START', sentences: mockSentences }, vi.fn())
    vi.clearAllMocks()
    ;(chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation(
      (_query: unknown, cb: (tabs: chrome.tabs.Tab[]) => void) => {
        cb([{ id: 1 } as chrome.tabs.Tab])
      }
    )

    handleMessage({ type: 'TTS_NEXT_SENTENCE' }, vi.fn())
    expect(chrome.tts.stop).toHaveBeenCalled()
    expect(chrome.tts.speak).toHaveBeenCalledWith(
      '第一段第二句。',
      expect.objectContaining({ onEvent: expect.any(Function) })
    )
  })

  it('TTS_PREV_SENTENCE: stops current and speaks previous', () => {
    handleMessage({ type: 'TTS_START', sentences: mockSentences }, vi.fn())
    vi.clearAllMocks()
    ;(chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation(
      (_query: unknown, cb: (tabs: chrome.tabs.Tab[]) => void) => {
        cb([{ id: 1 } as chrome.tabs.Tab])
      }
    )
    // Advance to index 2
    handleMessage({ type: 'TTS_NEXT_SENTENCE' }, vi.fn())
    handleMessage({ type: 'TTS_NEXT_SENTENCE' }, vi.fn())
    vi.clearAllMocks()
    ;(chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation(
      (_query: unknown, cb: (tabs: chrome.tabs.Tab[]) => void) => {
        cb([{ id: 1 } as chrome.tabs.Tab])
      }
    )

    handleMessage({ type: 'TTS_PREV_SENTENCE' }, vi.fn())
    expect(chrome.tts.speak).toHaveBeenCalledWith(
      '第一段第二句。',
      expect.any(Object)
    )
  })

  it('TTS_NEXT_PARAGRAPH: jumps to start of next paragraph', () => {
    handleMessage({ type: 'TTS_START', sentences: mockSentences }, vi.fn())
    vi.clearAllMocks()
    ;(chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation(
      (_query: unknown, cb: (tabs: chrome.tabs.Tab[]) => void) => {
        cb([{ id: 1 } as chrome.tabs.Tab])
      }
    )

    handleMessage({ type: 'TTS_NEXT_PARAGRAPH' }, vi.fn())
    expect(chrome.tts.speak).toHaveBeenCalledWith(
      '第二段关键词出现。',
      expect.any(Object)
    )
  })

  it('TTS_PREV_PARAGRAPH: jumps to start of previous paragraph', () => {
    handleMessage({ type: 'TTS_START', sentences: mockSentences }, vi.fn())
    // Move to paragraph 1
    handleMessage({ type: 'TTS_NEXT_PARAGRAPH' }, vi.fn())
    vi.clearAllMocks()
    ;(chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation(
      (_query: unknown, cb: (tabs: chrome.tabs.Tab[]) => void) => {
        cb([{ id: 1 } as chrome.tabs.Tab])
      }
    )

    handleMessage({ type: 'TTS_PREV_PARAGRAPH' }, vi.fn())
    expect(chrome.tts.speak).toHaveBeenCalledWith(
      '第一段第一句。',
      expect.any(Object)
    )
  })

  it('TTS_JUMP_KEYWORD: jumps to sentence containing keyword', () => {
    handleMessage({ type: 'TTS_START', sentences: mockSentences }, vi.fn())
    vi.clearAllMocks()
    ;(chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation(
      (_query: unknown, cb: (tabs: chrome.tabs.Tab[]) => void) => {
        cb([{ id: 1 } as chrome.tabs.Tab])
      }
    )

    const sendResponse = vi.fn()
    handleMessage({ type: 'TTS_JUMP_KEYWORD', keyword: '关键词' }, sendResponse)
    expect(chrome.tts.speak).toHaveBeenCalledWith(
      '第二段关键词出现。',
      expect.any(Object)
    )
    expect(sendResponse).toHaveBeenCalledWith({ found: true })
  })

  it('TTS_JUMP_KEYWORD: responds with found:false when keyword missing', () => {
    handleMessage({ type: 'TTS_START', sentences: mockSentences }, vi.fn())
    vi.clearAllMocks()

    const sendResponse = vi.fn()
    handleMessage({ type: 'TTS_JUMP_KEYWORD', keyword: '不存在' }, sendResponse)
    expect(sendResponse).toHaveBeenCalledWith({ found: false })
  })

  it('auto-advances to next sentence on TTS end event', () => {
    // Override speak to fire end event synchronously
    ;(chrome.tts.speak as ReturnType<typeof vi.fn>).mockImplementation(
      (_text: string, opts?: object & { onEvent?: (e: { type: string; charIndex: number }) => void }) => {
        opts?.onEvent?.({ type: 'end', charIndex: 0 })
      }
    )
    ;(chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation(
      (_query: unknown, cb: (tabs: chrome.tabs.Tab[]) => void) => {
        cb([{ id: 1 } as chrome.tabs.Tab])
      }
    )

    // Start with just 2 sentences so it auto-advances once then stops
    const twoSentences: SentenceIndex[] = mockSentences.slice(0, 2)
    handleMessage({ type: 'TTS_START', sentences: twoSentences }, vi.fn())

    // Should have spoken both sentences in sequence
    const calls = (chrome.tts.speak as ReturnType<typeof vi.fn>).mock.calls
    expect(calls[0][0]).toBe('第一段第一句。')
    expect(calls[1][0]).toBe('第一段第二句。')
  })
})
