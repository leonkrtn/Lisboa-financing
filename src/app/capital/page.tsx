'use client'
import { useEffect, useState, useCallback } from 'react'
import type { CapitalItem } from '@/types'
import { fmt, calculateNetCapital } from '@/lib/calculations'

type Category = 'Cash' | 'Receivables' | 'Payables' | 'Provisions'

const CATEGORIES: { key: Category; label: string; sign: '+' | '-'; color: string }[] = [
  { key: 'Cash', label: 'Cash', sign: '+', color: 'text-[#059669]' },
  { key: 'Receivables', label: 'Receivables', sign: '+', color: 'text-[#3B82F6]' },
  { key: 'Payables', label: 'Payables', sign: '-', color: 'text-[#DC2626]' },
  { key: 'Provisions', label: 'Provisions', sign: '-', color: 'text-[#9333EA]' },
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

  const fetchItems = useCallback(async () => {
    const r = await fetch('/api/capital-items')
    const d = await r.json()
    setItems(d)
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const tabItems = items.filter(i => i.category === activeTab)
  const netCapital = calculateNetCapital(items)

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
    items.filter(i => i.category === key).reduce((s, i) => s + (i.amount || 0), 0)

  if (loading) return <Center>Laden…</Center>

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto space-y-5">

      {/* Net Capital */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1">Netto-Kapital</p>
        <p className={`text-4xl font-bold num ${netCapital >= 0 ? 'pos' : 'neg'}`}>
          {netCapital < 0 ? '–' : ''}€ {fmt(Math.abs(netCapital))}
        </p>
        <p className="text-xs text-[#9CA3AF] mt-1">Cash + Receivables − Payables − Provisions</p>
        {/* Mini breakdown */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-[#F3F4F6]">
          {CATEGORIES.map(cat => (
            <div key={cat.key} className="text-sm">
              <span className="text-[#6B7280]">{cat.label} </span>
              <span className={`font-semibold num ${cat.color}`}>
                {cat.sign}€ {fmt(catSum(cat.key))}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="flex border-b border-[#E5E7EB]">
          {CATEGORIES.map(cat => {
            const count = items.filter(i => i.category === cat.key).length
            return (
              <button
                key={cat.key}
                onClick={() => setActiveTab(cat.key)}
                className={`flex-1 px-3 py-3 text-sm font-medium transition-colors ${
                  activeTab === cat.key
                    ? 'border-b-2 border-[#1E3A8A] text-[#1E3A8A] bg-[#EFF6FF]'
                    : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB]'
                }`}
              >
                {cat.label}
                {count > 0 && (
                  <span className="ml-1.5 text-xs bg-[#E5E7EB] text-[#6B7280] rounded-full px-1.5 py-0.5">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="p-4 space-y-2">
          {/* Category description */}
          <p className="text-xs text-[#6B7280] mb-3">
            {activeTab === 'Cash' && 'Bargeld, Bankguthaben, sofort verfügbare Mittel'}
            {activeTab === 'Receivables' && 'Ausstehende Zahlungen, Forderungen, noch nicht erhaltene Beträge'}
            {activeTab === 'Payables' && 'Offene Rechnungen, Schulden, Zahlungsverpflichtungen'}
            {activeTab === 'Provisions' && 'Rückstellungen, Reserven für zukünftige Ausgaben'}
          </p>

          {/* Item list */}
          {tabItems.length === 0 && (
            <p className="text-sm text-[#9CA3AF] py-2">Noch keine Einträge in dieser Kategorie.</p>
          )}

          {tabItems.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2"
            >
              {editingId === item.id ? (
                <>
                  <input
                    className="field flex-1 min-w-0"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') setEditingId(null) }}
                    autoFocus
                    placeholder="Bezeichnung"
                  />
                  <input
                    className="field w-32"
                    type="number"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') setEditingId(null) }}
                    placeholder="Betrag"
                    min="0"
                    step="0.01"
                  />
                  <button onClick={() => saveEdit(item.id)} disabled={saving} className="btn-primary px-3 py-1.5">✓</button>
                  <button onClick={() => setEditingId(null)} className="btn-ghost">✕</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-[#111827]">{item.name}</span>
                  <span className={`text-sm font-semibold num ${CATEGORIES.find(c => c.key === item.category)?.color}`}>
                    € {fmt(item.amount)}
                  </span>
                  <button onClick={() => startEdit(item)} className="btn-ghost text-xs">Bearbeiten</button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="btn-ghost text-xs text-[#DC2626] hover:text-[#DC2626]"
                    disabled={saving}
                  >
                    Löschen
                  </button>
                </>
              )}
            </div>
          ))}

          {/* Category total */}
          {tabItems.length > 0 && (
            <div className="flex justify-between items-center pt-2 border-t border-[#F3F4F6] px-3">
              <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Gesamt</span>
              <span className={`text-sm font-bold num ${CATEGORIES.find(c => c.key === activeTab)?.color}`}>
                € {fmt(catSum(activeTab))}
              </span>
            </div>
          )}

          {/* Add new item */}
          <div className="flex items-center gap-2 pt-3 border-t border-[#F3F4F6]">
            <input
              className="field flex-1 min-w-0"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addItem() }}
              placeholder={`Neue ${activeTab}-Position…`}
            />
            <input
              className="field w-32"
              type="number"
              value={newAmount}
              onChange={e => setNewAmount(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addItem() }}
              placeholder="Betrag"
              min="0"
              step="0.01"
            />
            <button onClick={addItem} disabled={saving || !newName.trim() || !newAmount} className="btn-primary whitespace-nowrap">
              + Hinzufügen
            </button>
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
