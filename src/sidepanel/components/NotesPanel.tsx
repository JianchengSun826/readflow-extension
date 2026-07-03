import { useNotes } from '../hooks/useNotes'

export default function NotesPanel() {
  const { notes, scrollToNote } = useNotes()

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 text-gray-400">
        <p className="text-2xl">📝</p>
        <p className="text-sm">本页暂无笔记</p>
        <p className="text-xs text-center">将鼠标悬停在段落上，点击「+ 笔记」添加</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <p className="text-xs text-gray-400">本页笔记（{notes.length} 条）</p>
      {notes.map(note => (
        <button
          key={note.id}
          onClick={() => scrollToNote(note)}
          className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-left hover:border-amber-300"
        >
          <p className="text-xs text-amber-600 mb-1 truncate">
            {note.anchorText.slice(0, 30)}...
          </p>
          <p className="text-sm text-gray-700 line-clamp-2">
            {note.content}
          </p>
        </button>
      ))}
    </div>
  )
}
