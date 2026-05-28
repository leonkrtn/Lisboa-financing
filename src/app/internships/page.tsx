'use client'
import { useEffect, useState, useCallback } from 'react'
import Modal from '@/components/Modal'
import { fmt, formatMonthLabel, generateMonthDates, getInternshipRatio } from '@/lib/calculations'
import type { Internship } from '@/types'

interface InternshipForm {
  name: string
  start_date: string
  end_date: string
  rent: string
  food: string
  fun: string
  gym: string
  transport: string
  gross_salary: string
  net_salary: string
  support_papa: string
  support_mama: string
}

const emptyForm: InternshipForm = {
  name: '',
  start_date: '',
  end_date: '',
  rent: '',
  food: '',
  fun: '',
  gym: '',
  transport: '',
  gross_salary: '',
  net_salary: '',
  support_papa: '',
  support_mama: '',
}

function toForm(intern: Internship): InternshipForm {
  return {
    name: intern.name,
    start_date: intern.start_date,
    end_date: intern.end_date,
    rent: String(intern.rent),
    food: String(intern.food),
    fun: String(intern.fun),
    gym: String(intern.gym),
    transport: String(intern.transport),
    gross_salary: String(intern.gross_salary),
    net_salary: String(intern.net_salary),
    support_papa: String(intern.support_papa),
    support_mama: String(intern.support_mama),
  }
}

function calcDurationMonths(intern: Internship): number {
  const start = new Date(intern.start_date)
  const end = new Date(intern.end_date)
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1
  )
}

function getPartialMonths(intern: Internship): { label: string; ratio: number }[] {
  const start = new Date(intern.start_date)
  const end = new Date(intern.end_date)
  const startStr =
    start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-01'
  const months = generateMonthDates(startStr, calcDurationMonths(intern))
  return months
    .map(md => {
      const ratio = getInternshipRatio(md, intern)
      return { label: formatMonthLabel(md), ratio }
    })
    .filter(m => m.ratio < 1)
}

export default function InternshipsPage() {
  const [internships, setInternships] = useState<Internship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<InternshipForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/internships')
      const data = await res.json()
      if (Array.isArray(data)) setInternships(data)
    } catch {
      setError('Failed to load internships')
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

  function openEdit(intern: Internship) {
    setEditingId(intern.id)
    setForm(toForm(intern))
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!form.name || !form.start_date || !form.end_date) {
      setFormError('Name, start date, and end date are required')
      return
    }
    setSaving(true)
    try {
      const body = {
        name: form.name,
        start_date: form.start_date,
        end_date: form.end_date,
        rent: Number(form.rent) || 0,
        food: Number(form.food) || 0,
        fun: Number(form.fun) || 0,
        gym: Number(form.gym) || 0,
        transport: Number(form.transport) || 0,
        gross_salary: Number(form.gross_salary) || 0,
        net_salary: Number(form.net_salary) || 0,
        support_papa: Number(form.support_papa) || 0,
        support_mama: Number(form.support_mama) || 0,
      }

      const url = editingId ? `/api/internships/${editingId}` : '/api/internships'
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
    await fetch(`/api/internships/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    await fetchData()
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <h1 className="text-xl font-bold text-[#1A1A1A] mb-6">Internships</h1>
        <div className="border border-[#E5E5E5] h-48 bg-[#F8F8F8] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1A1A1A]">Internships</h1>
        <button
          onClick={openAdd}
          className="bg-[#C9A84C] text-white px-4 py-1.5 text-sm font-medium hover:bg-[#b8953f] transition-colors"
        >
          + Add
        </button>
      </div>

      {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

      {internships.length === 0 ? (
        <div className="border border-[#E5E5E5] p-8 text-center text-gray-400 text-sm">
          No internships yet. Click &ldquo;+ Add&rdquo; to create one.
        </div>
      ) : (
        <div className="space-y-6">
          {internships.map(intern => {
            const duration = calcDurationMonths(intern)
            const partialMonths = getPartialMonths(intern)

            return (
              <div key={intern.id} className="border border-[#E5E5E5]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-[#E5E5E5]">
                  <div>
                    <span className="font-semibold text-[#1A1A1A]">{intern.name}</span>
                    <span className="ml-3 text-sm text-gray-500">
                      {intern.start_date} → {intern.end_date} ({duration} month{duration !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(intern)}
                      className="text-xs text-[#C9A84C] hover:underline"
                    >
                      Edit
                    </button>
                    {deleteConfirm === intern.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(intern.id)}
                          className="text-xs text-white bg-red-600 px-2 py-0.5 hover:bg-red-700"
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-xs text-gray-500 hover:bg-[#F8F8F8] px-2"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(intern.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="table-header">Rent</th>
                        <th className="table-header">Food</th>
                        <th className="table-header">Fun</th>
                        <th className="table-header">Gym</th>
                        <th className="table-header">Transport</th>
                        <th className="table-header">Gross Salary</th>
                        <th className="table-header">Net Salary</th>
                        <th className="table-header">Support Papa</th>
                        <th className="table-header">Support Mama</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="table-cell">€ {fmt(intern.rent)}</td>
                        <td className="table-cell">€ {fmt(intern.food)}</td>
                        <td className="table-cell">€ {fmt(intern.fun)}</td>
                        <td className="table-cell">€ {fmt(intern.gym)}</td>
                        <td className="table-cell">€ {fmt(intern.transport)}</td>
                        <td className="table-cell">€ {fmt(intern.gross_salary)}</td>
                        <td className="table-cell positive font-medium">€ {fmt(intern.net_salary)}</td>
                        <td className="table-cell">€ {fmt(intern.support_papa)}</td>
                        <td className="table-cell">€ {fmt(intern.support_mama)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Partial months */}
                {partialMonths.length > 0 && (
                  <div className="px-4 py-3 border-t border-[#E5E5E5] bg-[#F8F8F8]">
                    <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                      Prorata months
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {partialMonths.map(pm => (
                        <span
                          key={pm.label}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
                        >
                          {pm.label}: {(pm.ratio * 100).toFixed(0)}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setFormError(null) }}
        title={editingId ? 'Edit Internship' : 'Add Internship'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#1A1A1A] mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Internship Paris"
              className="w-full border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#C9A84C]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#1A1A1A] mb-1">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#C9A84C]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#1A1A1A] mb-1">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#C9A84C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NumberField label="Gross Salary (€/mo)" value={form.gross_salary} onChange={v => setForm(p => ({ ...p, gross_salary: v }))} />
            <NumberField label="Net Salary (€/mo)" value={form.net_salary} onChange={v => setForm(p => ({ ...p, net_salary: v }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NumberField label="Rent (€/mo)" value={form.rent} onChange={v => setForm(p => ({ ...p, rent: v }))} />
            <NumberField label="Food (€/mo)" value={form.food} onChange={v => setForm(p => ({ ...p, food: v }))} />
            <NumberField label="Fun (€/mo)" value={form.fun} onChange={v => setForm(p => ({ ...p, fun: v }))} />
            <NumberField label="Gym (€/mo)" value={form.gym} onChange={v => setForm(p => ({ ...p, gym: v }))} />
            <NumberField label="Transport (€/mo)" value={form.transport} onChange={v => setForm(p => ({ ...p, transport: v }))} />
            <NumberField label="Support Papa (€/mo)" value={form.support_papa} onChange={v => setForm(p => ({ ...p, support_papa: v }))} />
            <NumberField label="Support Mama (€/mo)" value={form.support_mama} onChange={v => setForm(p => ({ ...p, support_mama: v }))} />
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

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
        className="w-full border border-[#E5E5E5] px-3 py-1.5 text-sm outline-none focus:border-[#C9A84C]"
      />
    </div>
  )
}
