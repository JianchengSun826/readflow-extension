import { useState } from 'react'
import TtsPanel from './components/TtsPanel'
import NotesPanel from './components/NotesPanel'

type Tab = 'tts' | 'notes'

export default function App() {
  const [tab, setTab] = useState<Tab>('tts')

  return (
    <div className="flex h-screen flex-col bg-white text-sm">
      {/* Header */}
      <div className="flex items-center border-b border-gray-100 px-4 py-3">
        <span className="font-semibold text-gray-800">ReadFlow</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setTab('tts')}
          className={`flex-1 py-2 text-sm transition-colors ${
            tab === 'tts'
              ? 'border-b-2 border-amber-400 font-medium text-amber-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🔊 朗读
        </button>
        <button
          onClick={() => setTab('notes')}
          className={`flex-1 py-2 text-sm transition-colors ${
            tab === 'notes'
              ? 'border-b-2 border-amber-400 font-medium text-amber-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📝 笔记
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'tts' ? <TtsPanel /> : <NotesPanel />}
      </div>
    </div>
  )
}
