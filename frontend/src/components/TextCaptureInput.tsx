import { useState } from 'react'

interface TextCaptureInputProps {
  onSubmit: (transcript: string) => void
  disabled?: boolean
}

/** Simule une transcription sans micro — pratique pour tester sans pouvoir parler. */
export function TextCaptureInput({ onSubmit, disabled }: TextCaptureInputProps) {
  const [text, setText] = useState('')

  const handleSubmit = () => {
    if (!text.trim()) return
    onSubmit(text.trim())
    setText('')
  }

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-xs">
      <p className="text-xs text-neutral-400">mode test — simule une transcription</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        placeholder="ex : j'ai mangé une pomme et 150 grammes de blanc de poulet"
        rows={2}
        className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-1.5 text-sm disabled:opacity-40"
      >
        Simuler
      </button>
    </div>
  )
}
