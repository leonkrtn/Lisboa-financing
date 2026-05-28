'use client'
import { useState, useRef, useEffect } from 'react'

interface InlineEditProps {
  value: string | number | boolean | null
  type?: 'text' | 'number' | 'boolean' | 'select'
  options?: { value: string; label: string }[]
  onSave: (value: string) => void
  className?: string
  format?: (v: string | number | boolean | null) => string
}

export default function InlineEdit({
  value,
  type = 'text',
  options = [],
  onSave,
  className = '',
  format,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (editing) {
      if (type === 'select') {
        selectRef.current?.focus()
      } else if (type !== 'boolean') {
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
  }, [editing, type])

  function displayValue(): string {
    if (format) return format(value)
    if (value === null || value === undefined) return '—'
    if (type === 'boolean') return value ? 'Yes' : 'No'
    if (type === 'select') {
      const opt = options.find(o => o.value === String(value))
      return opt ? opt.label : '—'
    }
    return String(value)
  }

  function handleClick() {
    if (type === 'boolean') {
      onSave(value ? 'false' : 'true')
      return
    }
    setDraft(value === null || value === undefined ? '' : String(value))
    setEditing(true)
  }

  function handleSave() {
    setEditing(false)
    onSave(draft)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setEditing(false)
      setDraft(value === null || value === undefined ? '' : String(value))
    }
  }

  if (type === 'boolean') {
    return (
      <div
        className={`flex items-center gap-2 cursor-pointer hover:bg-[#EFF6FF] transition-colors rounded ${className}`}
        onClick={handleClick}
        title="Click to toggle"
      >
        <span
          className={`inline-flex w-4 h-4 rounded border items-center justify-center transition-colors ${
            value ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white' : 'border-[#E2E8F0] bg-white'
          }`}
        >
          {value ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M2 5l2.5 2.5 3.5-4"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </span>
        <span className="text-sm text-[#0F172A]">{value ? 'Yes' : 'No'}</span>
      </div>
    )
  }

  if (editing && type === 'select') {
    return (
      <div className={`border-b-2 border-[#1E3A8A] ${className}`}>
        <select
          ref={selectRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent outline-none text-sm border-0 p-0 text-[#0F172A]"
        >
          <option value="">—</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (editing) {
    return (
      <div className={`border-b-2 border-[#1E3A8A] ${className}`}>
        <input
          ref={inputRef}
          type={type === 'number' ? 'number' : 'text'}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent outline-none text-sm border-0 p-0 text-[#0F172A]"
        />
      </div>
    )
  }

  return (
    <div
      className={`cursor-pointer hover:bg-[#EFF6FF] transition-colors rounded ${className}`}
      onClick={handleClick}
      title="Click to edit"
    >
      <span className="text-sm text-[#0F172A]">{displayValue()}</span>
    </div>
  )
}
