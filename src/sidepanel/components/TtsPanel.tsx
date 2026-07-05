import { useEffect } from 'react'
import { useTts } from '../hooks/useTts'

export default function TtsPanel() {
  const {
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
  } = useTts()

  const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); state.playing ? pause() : resume() }
      else if (e.key === 'j' || e.key === 'J') prevSentence()
      else if (e.key === 'k' || e.key === 'K') nextSentence()
      else if (e.key === 'h' || e.key === 'H') prevParagraph()
      else if (e.key === 'l' || e.key === 'L') nextParagraph()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [state.playing, pause, resume, prevSentence, nextSentence, prevParagraph, nextParagraph])

  const activeName = voicePref?.name ?? systemVoices[0]?.name ?? '未选择'
  const zhVoices = systemVoices.filter(v => v.lang.startsWith('zh'))
  const enVoices = systemVoices.filter(v => v.lang.startsWith('en'))

  return (
    <div className="flex flex-col gap-3 p-4">

      {/* 语音选择器 */}
      <details className="rounded-lg border border-gray-100 bg-gray-50 text-xs">
        <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none list-none">
          <span className="text-green-500">●</span>
          <span className="text-gray-700 flex-1 truncate">{activeName}</span>
          <span className="text-gray-400 shrink-0">切换语音 ▾</span>
        </summary>

        <div className="px-3 pb-3 pt-1 max-h-48 overflow-y-auto space-y-3">
          {zhVoices.length > 0 && (
            <div>
              <p className="text-gray-400 mb-1 font-medium">中文</p>
              <div className="space-y-1">
                {zhVoices.map(v => (
                  <label key={v.name} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio" name="voice"
                      checked={voicePref?.type === 'system' && voicePref.name === v.name
                        || (!voicePref && v === systemVoices[0])}
                      onChange={() => setVoice({ type: 'system', name: v.name })}
                      className="accent-amber-400"
                    />
                    <span className="text-gray-700">{v.name}</span>
                    <span className="text-gray-400">({v.lang})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {enVoices.length > 0 && (
            <div>
              <p className="text-gray-400 mb-1 font-medium">英文</p>
              <div className="space-y-1">
                {enVoices.map(v => (
                  <label key={v.name} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio" name="voice"
                      checked={voicePref?.type === 'system' && voicePref.name === v.name}
                      onChange={() => setVoice({ type: 'system', name: v.name })}
                      className="accent-amber-400"
                    />
                    <span className="text-gray-700">{v.name}</span>
                    <span className="text-gray-400">({v.lang})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {systemVoices.length === 0 && (
            <p className="text-gray-400">未检测到可用语音</p>
          )}
        </div>
      </details>

      {/* 进度 / 预览 */}
      <div className="rounded-lg bg-gray-50 p-3">
        <p className="text-xs text-gray-400 mb-1">
          {state.playing
            ? `正在朗读第 ${state.currentParagraphIndex + 1} 段 · 第 ${state.currentGlobalIndex + 1} / ${state.totalSentences} 句`
            : previewText ? '点击播放从此处开始' : '未开始'}
        </p>
        <p className="text-sm text-gray-700 line-clamp-2 min-h-[2.5rem]">
          {state.playing ? state.currentText : (previewText || '加载中…')}
        </p>
      </div>

      {/* 速度 */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-400 shrink-0">速度</span>
        <div className="flex gap-1 flex-1">
          {SPEEDS.map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`flex-1 rounded py-1 text-xs ${speed === s ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >{s}×</button>
          ))}
        </div>
      </div>

      {/* 主控制 */}
      <div className="flex items-center justify-center gap-2">
        <button onClick={prevParagraph} className="rounded p-2 text-gray-500 hover:bg-gray-100" title="上一段">⏮段</button>
        <button onClick={prevSentence}  className="rounded p-2 text-gray-500 hover:bg-gray-100" title="上一句">⏮句</button>

        <button
          onClick={state.playing ? pause : (state.totalSentences > 0 ? resume : startReading)}
          className="rounded-full bg-amber-400 px-5 py-2 text-white hover:bg-amber-500 text-lg"
        >{state.playing ? '⏸' : '▶'}</button>

        <button onClick={nextSentence}  className="rounded p-2 text-gray-500 hover:bg-gray-100" title="下一句">⏭句</button>
        <button onClick={nextParagraph} className="rounded p-2 text-gray-500 hover:bg-gray-100" title="下一段">⏭段</button>
      </div>

    </div>
  )
}
