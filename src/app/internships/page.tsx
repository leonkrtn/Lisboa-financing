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
        <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Internships</h1>
        <div className="card h-48 animate-pulse bg-[#F1F5F9]" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0F172A]">Internships</h1>
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

      {internships.length === 0 ? (
        <div className="card p-8 text-center text-[#64748B] text-sm">
          No internships yet. Click &ldquo;+ Add&rdquo; to create one.
        </div>
      ) : (
        <div className="space-y-6">
          {internships.map(intern => {
            const duration = calcDurationMonths(intern)
            const partialMonths = getPartialMonths(intern)

            return (
              <div key={intern.id} className="card overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#1E3A8A] to-[#1d4ed8]">
                  <div>
                    <div className="font-semibold text-white text-base">{intern.name}</div>
                    <div className="text-sm text-blue-200 mt-0.5">
                      {intern.start_date} → {intern.end_date} &nbsp;·&nbsp; {duration} month{duration !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(intern)}
                      className="border border-white/30 text-white hover:bg-white/10 rounded-lg px-3 py-1.5 text-sm transition-colors"
                    >
                      Edit
                    </button>
                    {deleteConfirm === intern.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(intern.id)}
                          className="bg-[#DC2626] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-red-700 transition-colors"
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="border border-white/30 text-white hover:bg-white/10 rounded-lg px-3 py-1.5 text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(intern.id)}
                        className="border border-red-300/50 text-red-200 hover:bg-red-900/30 rounded-lg px-3 py-1.5 text-sm transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Details table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="th">Rent</th>
                        <th className="th">Food</th>
                        <th className="th">Fun</th>
                        <th className="th">Gym</th>
                        <th className="th">Transport</th>
                        <th className="th">Gross Salary</th>
                        <th className="th">Net Salary</th>
                        <th className="th">Support Papa</th>
                        <th className="th">Support Mama</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="td">€ {fmt(intern.rent)}</td>
                        <td className="td">€ {fmt(intern.food)}</td>
                        <td className="td">€ {fmt(intern.fun)}</td>
                        <td className="td">€ {fmt(intern.gym)}</td>
                        <td className="td">€ {fmt(intern.transport)}</td>
                        <td className="td">€ {fmt(intern.gross_salary)}</td>
                        <td className="td positive font-semibold">€ {fmt(intern.net_salary)}</td>
                        <td className="td">€ {fmt(intern.support_papa)}</td>
                        <td className="td">€ {fmt(intern.support_mama)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Prorata badges */}
                {partialMonths.length > 0 && (
                  <div className="px-5 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
                    <div className="text-xs font-semibold text-[#64748B] mb-2 uppercase tracking-wide">
                      Prorata months
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {partialMonths.map(pm => (
                        <span
                          key={pm.label}
                          className="text-xs bg-[#EFF6FF] text-[#1E3A8A] px-2.5 py-1 rounded-full font-medium"
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
            <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Internship Paris"
              className="input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(prev => ({ ...prev, start_date: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm(prev => ({ ...prev, end_date: e.target.value }))}
                className="input"
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
      <label className="block text-xs font-medium text-[#64748B] mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
        className="input"
      />
    </div>
  )
}
