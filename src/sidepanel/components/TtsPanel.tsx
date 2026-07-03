import { useState, useEffect } from 'react'
import { useTts } from '../hooks/useTts'

export default function TtsPanel() {
  const {
    state,
    startReading,
    pause,
    resume,
    nextSentence,
    prevSentence,
    nextParagraph,
    prevParagraph,
    jumpToKeyword,
  } = useTts()

  const [keyword, setKeyword] = useState('')

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

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* 进度 */}
      <div className="rounded-lg bg-gray-50 p-3">
        <p className="text-xs text-gray-400 mb-1">
          {state.playing
            ? `正在朗读第 ${state.currentParagraphIndex + 1} 段 · 第 ${state.currentGlobalIndex + 1} / ${state.totalSentences} 句`
            : '未开始'}
        </p>
        <p className="text-sm text-gray-700 line-clamp-2 min-h-[2.5rem]">
          {state.currentText || '点击「开始朗读」读取当前页面'}
        </p>
      </div>

      {/* 主控制 */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={prevParagraph}
          className="rounded p-2 text-gray-500 hover:bg-gray-100"
          title="上一段"
        >⏮段</button>
        <button
          onClick={prevSentence}
          className="rounded p-2 text-gray-500 hover:bg-gray-100"
          title="上一句"
        >⏮句</button>

        {state.playing ? (
          <button
            onClick={pause}
            className="rounded-full bg-amber-400 px-4 py-2 text-white hover:bg-amber-500"
          >⏸</button>
        ) : (
          <button
            onClick={state.totalSentences > 0 ? resume : startReading}
            className="rounded-full bg-amber-400 px-4 py-2 text-white hover:bg-amber-500"
          >{state.totalSentences > 0 ? '▶' : '开始朗读'}</button>
        )}

        <button
          onClick={nextSentence}
          className="rounded p-2 text-gray-500 hover:bg-gray-100"
          title="下一句"
        >⏭句</button>
        <button
          onClick={nextParagraph}
          className="rounded p-2 text-gray-500 hover:bg-gray-100"
          title="下一段"
        >⏭段</button>
      </div>

      {/* 关键词跳转 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') jumpToKeyword(keyword) }}
          placeholder="关键词跳转..."
          className="flex-1 rounded border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-amber-400"
        />
        <button
          onClick={() => jumpToKeyword(keyword)}
          className="rounded bg-amber-400 px-3 py-1.5 text-sm text-white hover:bg-amber-500"
        >跳转</button>
      </div>
    </div>
  )
}
