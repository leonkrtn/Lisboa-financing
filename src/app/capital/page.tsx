'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import type { CapitalItem } from '@/types'
import { fmt, calculateNetCapital } from '@/lib/calculations'

type Category = 'Cash' | 'Receivables' | 'Payables' | 'Provisions'

const CATEGORIES: {
  key: Category
  label: string
  sign: '+' | '-'
  textColor: string
  bgColor: string
  borderColor: string
  description: string
}[] = [
  {
    key: 'Cash',
    label: 'Cash',
    sign: '+',
    textColor: 'text-[#059669]',
    bgColor: 'bg-[#ECFDF5]',
    borderColor: 'border-[#A7F3D0]',
    description: 'Bargeld, Bankguthaben, sofort verfügbare Mittel',
  },
  {
    key: 'Receivables',
    label: 'Receivables',
    sign: '+',
    textColor: 'text-[#2563EB]',
    bgColor: 'bg-[#EFF6FF]',
    borderColor: 'border-[#BFDBFE]',
    description: 'Ausstehende Zahlungen, Forderungen, noch nicht erhaltene Beträge',
  },
  {
    key: 'Payables',
    label: 'Payables',
    sign: '-',
    textColor: 'text-[#DC2626]',
    bgColor: 'bg-[#FEF2F2]',
    borderColor: 'border-[#FECACA]',
    description: 'Offene Rechnungen, Schulden, Zahlungsverpflichtungen',
  },
  {
    key: 'Provisions',
    label: 'Provisions',
    sign: '-',
    textColor: 'text-[#7C3AED]',
    bgColor: 'bg-[#F5F3FF]',
    borderColor: 'border-[#DDD6FE]',
    description: 'Rückstellungen, Reserven für zukünftige Ausgaben',
  },
]

export default function CapitalPage() {
  const [items, setItems] = useState<CapitalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Category>('Cash')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  const fetchItems = useCallback(async () => {
    const r = await fetch('/api/capital-items')
    const d = await r.json()
    setItems(d)
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const tabItems = items.filter(i => i.category === activeTab)
  const netCapital = calculateNetCapital(items)
  const activeCat = CATEGORIES.find(c => c.key === activeTab)!

  async function addItem() {
    if (!newName.trim() || !newAmount) return
    setSaving(true)
    await fetch('/api/capital-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), amount: parseFloat(newAmount), category: activeTab }),
    })
    setNewName('')
    setNewAmount('')
    await fetchItems()
    setSaving(false)
  }

  function startEdit(item: CapitalItem) {
    setEditingId(item.id)
    setEditName(item.name)
    setEditAmount(String(item.amount))
  }

  async function saveEdit(id: string) {
    setSaving(true)
    await fetch(`/api/capital-items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), amount: parseFloat(editAmount) || 0 }),
    })
    setEditingId(null)
    await fetchItems()
    setSaving(false)
  }

  async function deleteItem(id: string) {
    setSaving(true)
    await fetch(`/api/capital-items/${id}`, { method: 'DELETE' })
    await fetchItems()
    setSaving(false)
  }

  const catSum = (key: Category) =>
    items.filter(i => i.category === key).reduce((s, i) => s + (Number(i.amount) || 0), 0)

  if (loading) return <Center>Laden…</Center>

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto space-y-5">

      {/* Net Capital hero card */}
      <div className="card p-6">
        <p className="section-label mb-1">Netto-Kapital</p>
        <p className={`text-4xl font-bold num ${netCapital >= 0 ? 'pos' : 'neg'}`}>
          {netCapital < 0 ? '–' : ''}€ {fmt(Math.abs(netCapital))}
        </p>
        <p className="text-xs text-[#9CA3AF] mt-1">Cash + Receivables − Payables − Provisions</p>

        {/* Category breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-[#F3F4F6]">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => { setActiveTab(cat.key); setNewName(''); setNewAmount(''); setEditingId(null) }}
              className={`rounded-lg px-3 py-2.5 text-left transition-all border ${
                activeTab === cat.key
                  ? `${cat.bgColor} ${cat.borderColor}`
                  : 'border-transparent hover:bg-[#F9FAFB]'
              }`}
            >
              <p className="text-xs text-[#6B7280] font-medium">
                {cat.sign === '+' ? '+ ' : '− '}{cat.label}
              </p>
              <p className={`text-sm font-bold num mt-0.5 ${cat.textColor}`}>
                € {fmt(catSum(cat.key))}
              </p>
              <p className="text-xs text-[#9CA3AF]">
                {items.filter(i => i.category === cat.key).length} Position{items.filter(i => i.category === cat.key).length !== 1 ? 'en' : ''}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Items card */}
      <div className="card overflow-hidden">
        {/* Tab header */}
        <div className={`px-5 py-4 border-b border-[#E5E7EB] ${activeCat.bgColor}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#111827]">{activeCat.label}</h2>
              <p className="text-xs text-[#6B7280] mt-0.5">{activeCat.description}</p>
            </div>
            {tabItems.length > 0 && (
              <div className="text-right">
                <p className={`text-xl font-bold num ${activeCat.textColor}`}>
                  € {fmt(catSum(activeTab))}
                </p>
                <p className="text-xs text-[#9CA3AF]">Gesamt</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 space-y-2">
          {/* Empty state */}
          {tabItems.length === 0 && (
            <p className="text-sm text-[#9CA3AF] py-4 text-center">
              Noch keine Einträge in {activeCat.label}.
            </p>
          )}

          {/* Item list */}
          {tabItems.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2.5 bg-white hover:border-[#D1D5DB] transition-colors"
            >
              {editingId === item.id ? (
                <>
                  <input
                    className="field flex-1 min-w-0"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit(item.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                    placeholder="Bezeichnung"
                  />
                  <input
                    className="field w-32"
                    type="number"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit(item.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    placeholder="Betrag"
                    min="0"
                    step="0.01"
                  />
                  <button
                    onClick={() => saveEdit(item.id)}
                    disabled={saving}
                    className="btn-primary px-3 py-1.5 text-xs"
                  >
                    ✓
                  </button>
                  <button onClick={() => setEditingId(null)} className="btn-ghost text-xs">✕</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-[#111827]">{item.name}</span>
                  <span className={`text-sm font-semibold num ${activeCat.textColor}`}>
                    € {fmt(item.amount)}
                  </span>
                  <button onClick={() => startEdit(item)} className="btn-ghost text-xs">Bearbeiten</button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="btn-danger text-xs"
                    disabled={saving}
                  >
                    Löschen
                  </button>
                </>
              )}
            </div>
          ))}

          {/* Add form */}
          <div className="pt-3 border-t border-[#F3F4F6] space-y-2">
            <input
              className="field w-full"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); amountRef.current?.focus() }
              }}
              placeholder={`Neue ${activeCat.label}-Position benennen…`}
              autoComplete="off"
            />
            <div className="flex items-center gap-2">
              <input
                ref={amountRef}
                className="field flex-1"
                type="number"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addItem() }}
                placeholder="Betrag (€)"
                min="0"
                step="0.01"
              />
              <button
                onClick={addItem}
                disabled={saving || !newName.trim() || !newAmount}
                className="btn-primary whitespace-nowrap"
              >
                + Hinzufügen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-[#9CA3AF]">{children}</div>
  )
}
