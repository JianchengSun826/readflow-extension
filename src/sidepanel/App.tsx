import TtsPanel from './components/TtsPanel'

export default function App() {
  return (
    <div className="flex h-screen flex-col bg-white text-sm">
      <div className="flex items-center border-b border-gray-100 px-4 py-3">
        <span className="font-semibold text-gray-800">ReadFlow</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <TtsPanel />
      </div>
    </div>
  )
}
