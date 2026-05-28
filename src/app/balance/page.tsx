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
        <h1 className="text-xl font-bold text-[#1A1A1A] mb-6">Balance</h1>
        <div className="border border-[#E5E5E5] h-48 bg-[#F8F8F8] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1A1A1A]">Balance</h1>
        <button
          onClick={openAdd}
          className="bg-[#C9A84C] text-white px-4 py-1.5 text-sm font-medium hover:bg-[#b8953f] transition-colors"
        >
          + Add
        </button>
      </div>

      {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

      {/* Grouped by category */}
      {CATEGORIES.map(cat => {
        const catItems = items.filter(i => i.category === cat)
        if (catItems.length === 0) return null
        return (
          <div key={cat} className="mb-6 border border-[#E5E5E5]">
            <div className="px-4 py-2 bg-[#F8F8F8] border-b border-[#E5E5E5]">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{cat}</span>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="table-header">Name</th>
                  <th className="table-header">Dir</th>
                  <th className="table-header text-right">Amount</th>
                  <th className="table-header">Internship</th>
                  <th className="table-header text-right">Effective</th>
                  <th className="table-header" style={{ width: 100 }} />
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
                      <td className="table-cell font-medium">{item.name}</td>
                      <td className="table-cell">
                        <span
                          className={`font-bold text-base ${item.direction === '+' ? 'positive' : 'negative'}`}
                        >
                          {item.direction}
                        </span>
                      </td>
                      <td className="table-cell text-right">€ {fmt(item.amount)}</td>
                      <td className="table-cell text-gray-500 text-xs">
                        {linkedInternship ? linkedInternship.name : '—'}
                      </td>
                      <td className={`table-cell text-right font-medium ${item.direction === '+' ? 'positive' : 'negative'}`}>
                        {item.direction === '+' ? '+' : '-'}€ {fmt(effective)}
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(item)}
                            className="text-xs text-[#C9A84C] hover:underline"
                          >
                            Edit
                          </button>
                          {deleteConfirm === item.id ? (
                            <>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-xs text-white bg-red-600 px-1.5 py-0.5 hover:bg-red-700"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-xs text-gray-500"
                              >
                                No
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(item.id)}
                              className="text-xs text-red-500 hover:text-red-700"
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
        )
      })}

      {items.length === 0 && (
        <div className="border border-[#E5E5E5] p-8 text-center text-gray-400 text-sm">
          No balance items yet. Click &ldquo;+ Add&rdquo; to create one.
        </div>
      )}

      {/* Initial Savings Total */}
      <div className="mt-6 border border-[#E5E5E5] p-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-[#1A1A1A]">Initial Savings (sum of all items)</span>
        <span className={`text-lg font-bold ${initialSavings >= 0 ? 'positive' : 'negative'}`}>
          {initialSavings >= 0 ? '+' : ''}€ {fmt(initialSavings)}
        </span>
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setFormError(null) }}
        title={editingId ? 'Edit Balance Item' : 'Add Balance Item'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#1A1A1A] mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Savings Account"
              className="w-full border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#C9A84C]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#1A1A1A] mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#C9A84C]"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#1A1A1A] mb-1">Direction</label>
              <select
                value={form.direction}
                onChange={e => setForm(prev => ({ ...prev, direction: e.target.value }))}
                className="w-full border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#C9A84C]"
              >
                <option value="+">+ (Asset)</option>
                <option value="-">- (Liability)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#1A1A1A] mb-1">Amount (€)</label>
            <input
              type="number"
              value={form.amount}
              onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0"
              className="w-full border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#C9A84C]"
            />
            <p className="text-xs text-gray-400 mt-1">
              If linked to an internship, this field is ignored and net_salary × duration is used instead.
            </p>
          </div>

          <div>
            <label className="block text-sm text-[#1A1A1A] mb-1">Link to Internship (optional)</label>
            <select
              value={form.internship_id}
              onChange={e => setForm(prev => ({ ...prev, internship_id: e.target.value }))}
              className="w-full border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#C9A84C]"
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
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setModalOpen(false); setFormError(null) }}
              className="text-sm text-gray-500 px-4 py-2 hover:bg-[#F8F8F8]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#C9A84C] text-white px-5 py-2 text-sm font-medium hover:bg-[#b8953f] disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
