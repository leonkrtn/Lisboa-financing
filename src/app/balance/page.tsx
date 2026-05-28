'use client'
import { useEffect, useState, useCallback } from 'react'
import Modal from '@/components/Modal'
import { fmt } from '@/lib/calculations'
import type { BalanceItem, Internship } from '@/types'

interface BalanceForm {
  name: string
  category: string
  direction: string
  amount: string
  internship_id: string
}

const emptyForm: BalanceForm = {
  name: '',
  category: 'Cash',
  direction: '+',
  amount: '',
  internship_id: '',
}

function calcEffectiveAmount(item: BalanceItem, internships: Internship[]): number {
  if (item.internship_id) {
    const intern = internships.find(i => i.id === item.internship_id)
    if (intern) {
      const start = new Date(intern.start_date)
      const end = new Date(intern.end_date)
      const months =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth()) +
        1
      return intern.net_salary * months
    }
  }
  return item.amount
}

const CATEGORIES: BalanceItem['category'][] = ['Cash', 'Receivables', 'Provision']

const categoryBadge: Record<BalanceItem['category'], string> = {
  Cash: 'bg-[#DCFCE7] text-[#16A34A]',
  Receivables: 'bg-[#DBEAFE] text-[#1E3A8A]',
  Provision: 'bg-[#FEF3C7] text-[#D97706]',
}

export default function BalancePage() {
  const [items, setItems] = useState<BalanceItem[]>([])
  const [internships, setInternships] = useState<Internship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<BalanceForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [balRes, intRes] = await Promise.all([
        fetch('/api/balance'),
        fetch('/api/internships'),
      ])
      const balData = await balRes.json()
      const intData = await intRes.json()
      if (Array.isArray(balData)) setItems(balData)
      if (Array.isArray(intData)) setInternships(intData)
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(item: BalanceItem) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      category: item.category,
      direction: item.direction,
      amount: String(item.amount),
      internship_id: item.internship_id ?? '',
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!form.name) {
      setFormError('Name is required')
      return
    }
    setSaving(true)
    try {
      const body = {
        name: form.name,
        category: form.category,
        direction: form.direction,
        amount: Number(form.amount) || 0,
        internship_id: form.internship_id || null,
      }

      const url = editingId ? `/api/balance/${editingId}` : '/api/balance'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }

      setModalOpen(false)
      await fetchData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/balance/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    await fetchData()
  }

  const initialSavings = items.reduce((sum, item) => {
    const effective = calcEffectiveAmount(item, internships)
    return item.direction === '+' ? sum + effective : sum - effective
  }, 0)

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Balance</h1>
        <div className="card h-48 animate-pulse bg-[#F1F5F9]" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0F172A]">Balance</h1>
        <button
          onClick={openAdd}
          className="bg-[#1E3A8A] text-white hover:bg-[#172554] rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          + Add
        </button>
      </div>

      {error && (
        <div className="text-[#DC2626] text-sm bg-[#FEF2F2] border border-red-200 rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* Grouped by category */}
      {CATEGORIES.map(cat => {
        const catItems = items.filter(i => i.category === cat)
        if (catItems.length === 0) return null
        return (
          <div key={cat} className="card overflow-hidden mb-5">
            <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center gap-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryBadge[cat]}`}>
                {cat}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="th">Name</th>
                    <th className="th">Direction</th>
                    <th className="th text-right">Amount</th>
                    <th className="th">Internship</th>
                    <th className="th text-right">Effective</th>
                    <th className="th" style={{ width: 110 }} />
                  </tr>
                </thead>
                <tbody>
                  {catItems.map(item => {
                    const effective = calcEffectiveAmount(item, internships)
                    const linkedInternship = item.internship_id
                      ? internships.find(i => i.id === item.internship_id)
                      : null
                    return (
                      <tr key={item.id}>
                        <td className="td font-medium">{item.name}</td>
                        <td className="td">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                              item.direction === '+'
                                ? 'bg-[#DCFCE7] text-[#16A34A]'
                                : 'bg-[#FEE2E2] text-[#DC2626]'
                            }`}
                          >
                            {item.direction}
                          </span>
                        </td>
                        <td className="td text-right">€ {fmt(item.amount)}</td>
                        <td className="td text-[#64748B] text-xs">
                          {linkedInternship ? linkedInternship.name : '—'}
                        </td>
                        <td className={`td text-right font-semibold ${item.direction === '+' ? 'positive' : 'negative'}`}>
                          {item.direction === '+' ? '+' : '−'}€ {fmt(effective)}
                        </td>
                        <td className="td">
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => openEdit(item)}
                              className="border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9] rounded px-2 py-0.5 text-xs transition-colors"
                            >
                              Edit
                            </button>
                            {deleteConfirm === item.id ? (
                              <>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="text-xs text-white bg-[#DC2626] px-2 py-0.5 rounded hover:bg-red-700 transition-colors"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="text-xs text-[#64748B] px-2 py-0.5 rounded hover:bg-[#F1F5F9] transition-colors"
                                >
                                  No
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(item.id)}
                                className="text-[#DC2626] hover:text-red-800 text-xs transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {items.length === 0 && (
        <div className="card p-8 text-center text-[#64748B] text-sm">
          No balance items yet. Click &ldquo;+ Add&rdquo; to create one.
        </div>
      )}

      {/* Initial Savings Total */}
      <div className="card mt-4 p-5 bg-gradient-to-r from-[#1E3A8A] to-[#1d4ed8] border-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-200">Initial Savings</div>
            <div className="text-sm text-white/70 mt-0.5">Sum of all balance items</div>
          </div>
          <span className={`text-2xl font-bold ${initialSavings >= 0 ? 'text-[#86EFAC]' : 'text-[#FCA5A5]'}`}>
            {initialSavings >= 0 ? '+' : '−'}€ {fmt(Math.abs(initialSavings))}
          </span>
        </div>
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setFormError(null) }}
        title={editingId ? 'Edit Balance Item' : 'Add Balance Item'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Savings Account"
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                className="input"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Direction</label>
              <select
                value={form.direction}
                onChange={e => setForm(prev => ({ ...prev, direction: e.target.value }))}
                className="input"
              >
                <option value="+">+ (Asset)</option>
                <option value="-">- (Liability)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Amount (€)</label>
            <input
              type="number"
              value={form.amount}
              onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0"
              className="input"
            />
            <p className="text-xs text-[#64748B] mt-1.5">
              If linked to an internship, this field is ignored — net_salary × duration is used instead.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Link to Internship (optional)</label>
            <select
              value={form.internship_id}
              onChange={e => setForm(prev => ({ ...prev, internship_id: e.target.value }))}
              className="input"
            >
              <option value="">— None —</option>
              {internships.map(intern => (
                <option key={intern.id} value={intern.id}>
                  {intern.name} ({intern.start_date} → {intern.end_date})
                </option>
              ))}
            </select>
          </div>

          {formError && (
            <div className="text-[#DC2626] text-sm bg-[#FEF2F2] border border-red-200 rounded-lg px-4 py-3">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setModalOpen(false); setFormError(null) }}
              className="border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg px-4 py-2 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#1E3A8A] text-white hover:bg-[#172554] rounded-lg px-5 py-2 text-sm font-medium transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
