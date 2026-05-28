'use client'
import { useEffect, useState, useCallback } from 'react'
import Modal from '@/components/Modal'
import InlineEdit from '@/components/InlineEdit'
import { fmt } from '@/lib/calculations'
import type { IncomeType } from '@/types'

interface IncomeTypeForm {
  name: string
  hours_per_week: string
  salary_per_hour: string
  tax_rate: string
}

const emptyForm: IncomeTypeForm = {
  name: '',
  hours_per_week: '',
  salary_per_hour: '',
  tax_rate: '',
}

export default function IncomeTypesPage() {
  const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<IncomeTypeForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/income-types')
      const data = await res.json()
      if (Array.isArray(data)) setIncomeTypes(data)
    } catch {
      setError('Failed to load income types')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function calcMonthlyNet(it: IncomeType): number {
    return it.hours_per_week * it.salary_per_hour * (1 - it.tax_rate) * 4.34
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!form.name) {
      setFormError('Name is required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/income-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          hours_per_week: Number(form.hours_per_week) || 0,
          salary_per_hour: Number(form.salary_per_hour) || 0,
          tax_rate: Number(form.tax_rate) || 0,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create')
      }
      setModalOpen(false)
      setForm(emptyForm)
      await fetchData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  async function handlePatch(id: string, field: string, value: string) {
    const updates: Record<string, string | number> = {}
    if (field === 'name') updates.name = value
    else updates[field] = Number(value) || 0

    await fetch(`/api/income-types/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    await fetchData()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/income-types/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    await fetchData()
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <h1 className="text-xl font-bold text-[#1A1A1A] mb-6">Income Types</h1>
        <div className="border border-[#E5E5E5] h-48 bg-[#F8F8F8] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1A1A1A]">Income Types</h1>
        <button
          onClick={() => { setForm(emptyForm); setFormError(null); setModalOpen(true) }}
          className="bg-[#C9A84C] text-white px-4 py-1.5 text-sm font-medium hover:bg-[#b8953f] transition-colors"
        >
          + Add
        </button>
      </div>

      {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

      {incomeTypes.length === 0 ? (
        <div className="border border-[#E5E5E5] p-8 text-center text-gray-400 text-sm">
          No income types yet. Click &ldquo;+ Add&rdquo; to create one.
        </div>
      ) : (
        <div className="border border-[#E5E5E5] overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header text-right">Hours/Week</th>
                <th className="table-header text-right">Salary/Hour</th>
                <th className="table-header text-right">Tax Rate</th>
                <th className="table-header text-right">Monthly Net</th>
                <th className="table-header" style={{ width: 60 }} />
              </tr>
            </thead>
            <tbody>
              {incomeTypes.map(it => (
                <tr key={it.id}>
                  <td className="table-cell editable-cell p-0">
                    <InlineEdit
                      value={it.name}
                      type="text"
                      onSave={v => handlePatch(it.id, 'name', v)}
                      className="px-3 py-1.5"
                    />
                  </td>
                  <td className="table-cell editable-cell p-0 text-right">
                    <InlineEdit
                      value={it.hours_per_week}
                      type="number"
                      onSave={v => handlePatch(it.id, 'hours_per_week', v)}
                      className="px-3 py-1.5 text-right"
                      format={v => String(v)}
                    />
                  </td>
                  <td className="table-cell editable-cell p-0 text-right">
                    <InlineEdit
                      value={it.salary_per_hour}
                      type="number"
                      onSave={v => handlePatch(it.id, 'salary_per_hour', v)}
                      className="px-3 py-1.5 text-right"
                      format={v => `€ ${fmt(Number(v))}`}
                    />
                  </td>
                  <td className="table-cell editable-cell p-0 text-right">
                    <InlineEdit
                      value={it.tax_rate}
                      type="number"
                      onSave={v => handlePatch(it.id, 'tax_rate', v)}
                      className="px-3 py-1.5 text-right"
                      format={v => `${(Number(v) * 100).toFixed(0)}%`}
                    />
                  </td>
                  <td className="table-cell text-right font-medium positive">
                    € {fmt(calcMonthlyNet(it))}
                  </td>
                  <td className="table-cell">
                    {deleteConfirm === it.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDelete(it.id)}
                          className="text-xs text-white bg-red-600 px-2 py-0.5 hover:bg-red-700"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-xs text-gray-600 px-2 py-0.5 hover:bg-[#F8F8F8]"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(it.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setFormError(null) }}
        title="Add Income Type"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm text-[#1A1A1A] mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Student Job"
              className="w-full border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#C9A84C]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#1A1A1A] mb-1">Hours/Week</label>
              <input
                type="number"
                value={form.hours_per_week}
                onChange={e => setForm(prev => ({ ...prev, hours_per_week: e.target.value }))}
                placeholder="0"
                className="w-full border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#C9A84C]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#1A1A1A] mb-1">Salary/Hour (€)</label>
              <input
                type="number"
                value={form.salary_per_hour}
                onChange={e => setForm(prev => ({ ...prev, salary_per_hour: e.target.value }))}
                placeholder="0"
                className="w-full border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#C9A84C]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#1A1A1A] mb-1">Tax Rate (0–1, e.g. 0.20 = 20%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={form.tax_rate}
              onChange={e => setForm(prev => ({ ...prev, tax_rate: e.target.value }))}
              placeholder="0.20"
              className="w-full border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#C9A84C]"
            />
          </div>

          {form.hours_per_week && form.salary_per_hour && (
            <div className="bg-[#F8F8F8] border border-[#E5E5E5] px-3 py-2 text-sm">
              Monthly Net (est.): <strong>
                € {fmt(Number(form.hours_per_week) * Number(form.salary_per_hour) * (1 - Number(form.tax_rate || 0)) * 4.34)}
              </strong>
            </div>
          )}

          {formError && <div className="text-red-600 text-sm">{formError}</div>}

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
              {saving ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
