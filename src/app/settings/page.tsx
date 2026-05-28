'use client'
import { useEffect, useState, useCallback } from 'react'
import InlineEdit from '@/components/InlineEdit'
import Modal from '@/components/Modal'
import { fmt, formatMonthLabel, generateMonthDates, getInternshipRatio } from '@/lib/calculations'
import type { IncomeType, Internship, BalanceItem } from '@/types'

type Tab = 'config' | 'income-types' | 'internships' | 'balance'

// ─── Config Tab ────────────────────────────────────────────────────────────────

interface ConfigForm {
  rent: string
  food_per_day: string
  fun_per_day: string
  insurance: string
  insurance_active: string
  flight_price: string
  other_monthly: string
  support_papa: string
  support_mama: string
  start_month: string
  num_months: string
  savings_goal: string
}

const CONFIG_DEFAULTS: ConfigForm = {
  rent: '',
  food_per_day: '',
  fun_per_day: '',
  insurance: '',
  insurance_active: 'false',
  flight_price: '',
  other_monthly: '',
  support_papa: '',
  support_mama: '',
  start_month: '',
  num_months: '',
  savings_goal: '',
}

function ConfigTab() {
  const [form, setForm] = useState<ConfigForm>(CONFIG_DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(data => {
        setForm({
          rent: data.rent ?? '',
          food_per_day: data.food_per_day ?? '',
          fun_per_day: data.fun_per_day ?? '',
          insurance: data.insurance ?? '',
          insurance_active: data.insurance_active ?? 'false',
          flight_price: data.flight_price ?? '',
          other_monthly: data.other_monthly ?? '',
          support_papa: data.support_papa ?? '',
          support_mama: data.support_mama ?? '',
          start_month: data.start_month ? data.start_month.slice(0, 7) : '',
          num_months: data.num_months ?? '',
          savings_goal: data.savings_goal ?? '',
        })
      })
      .catch(() => setError('Failed to load config'))
      .finally(() => setLoading(false))
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload: Record<string, string> = {
        rent: form.rent,
        food_per_day: form.food_per_day,
        fun_per_day: form.fun_per_day,
        insurance: form.insurance,
        insurance_active: form.insurance_active,
        flight_price: form.flight_price,
        other_monthly: form.other_monthly,
        support_papa: form.support_papa,
        support_mama: form.support_mama,
        start_month: form.start_month ? form.start_month + '-01' : '',
        num_months: form.num_months,
        savings_goal: form.savings_goal,
      }
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Save failed')
      showToast('Config saved successfully')
    } catch {
      setError('Failed to save config')
    } finally {
      setSaving(false)
    }
  }

  function set(key: keyof ConfigForm, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-10 bg-[#F1F5F9] rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (error && !saving) {
    return (
      <div className="text-[#DC2626] text-sm bg-[#FEF2F2] border border-red-200 rounded-lg px-4 py-3">{error}</div>
    )
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {toast && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-4 py-3">
          {toast}
        </div>
      )}
      {error && (
        <div className="text-[#DC2626] text-sm bg-[#FEF2F2] border border-red-200 rounded-lg px-4 py-3">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Rent */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#0F172A]">Rent <span className="text-[#64748B] font-normal">(€/month)</span></label>
          <input
            className="input"
            type="number"
            step="0.01"
            value={form.rent}
            onChange={e => set('rent', e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* Food per day */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#0F172A]">Food per day <span className="text-[#64748B] font-normal">(€/day)</span></label>
          <input
            className="input"
            type="number"
            step="0.01"
            value={form.food_per_day}
            onChange={e => set('food_per_day', e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* Fun per day */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#0F172A]">Fun per day <span className="text-[#64748B] font-normal">(€/day)</span></label>
          <input
            className="input"
            type="number"
            step="0.01"
            value={form.fun_per_day}
            onChange={e => set('fun_per_day', e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* Insurance amount */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#0F172A]">Insurance amount <span className="text-[#64748B] font-normal">(€/month)</span></label>
          <input
            className="input"
            type="number"
            step="0.01"
            value={form.insurance}
            onChange={e => set('insurance', e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* Insurance Active */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#0F172A]">Insurance Active</label>
          <div className="flex items-center gap-3 h-10">
            <button
              type="button"
              role="switch"
              aria-checked={form.insurance_active === 'true'}
              onClick={() => set('insurance_active', form.insurance_active === 'true' ? 'false' : 'true')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:ring-offset-2 ${
                form.insurance_active === 'true' ? 'bg-[#1E3A8A]' : 'bg-[#E2E8F0]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.insurance_active === 'true' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-[#64748B]">{form.insurance_active === 'true' ? 'Active' : 'Inactive'}</span>
          </div>
        </div>

        {/* Flight Price */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#0F172A]">Flight Price <span className="text-[#64748B] font-normal">(€)</span></label>
          <input
            className="input"
            type="number"
            step="0.01"
            value={form.flight_price}
            onChange={e => set('flight_price', e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* Other Monthly */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#0F172A]">Other Monthly <span className="text-[#64748B] font-normal">(€/month)</span></label>
          <input
            className="input"
            type="number"
            step="0.01"
            value={form.other_monthly}
            onChange={e => set('other_monthly', e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* Support Papa */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#0F172A]">Support Papa <span className="text-[#64748B] font-normal">(€/month)</span></label>
          <input
            className="input"
            type="number"
            step="0.01"
            value={form.support_papa}
            onChange={e => set('support_papa', e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* Support Mama */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#0F172A]">Support Mama <span className="text-[#64748B] font-normal">(€/month)</span></label>
          <input
            className="input"
            type="number"
            step="0.01"
            value={form.support_mama}
            onChange={e => set('support_mama', e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* Start Month */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#0F172A]">Start Month</label>
          <input
            className="input"
            type="month"
            value={form.start_month}
            onChange={e => set('start_month', e.target.value)}
          />
        </div>

        {/* Number of Months */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#0F172A]">Number of Months</label>
          <input
            className="input"
            type="number"
            min="1"
            max="120"
            value={form.num_months}
            onChange={e => set('num_months', e.target.value)}
            placeholder="24"
          />
        </div>

        {/* Savings Goal */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#0F172A]">Savings Goal <span className="text-[#64748B] font-normal">(€)</span></label>
          <input
            className="input"
            type="number"
            step="0.01"
            value={form.savings_goal}
            onChange={e => set('savings_goal', e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-[#1E3A8A] text-white hover:bg-[#172554] rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Config'}
        </button>
      </div>
    </form>
  )
}

// ─── Income Types Tab ───────────────────────────────────────────────────────────

function incomeMonthlyNet(it: IncomeType): number {
  return it.hours_per_week * it.salary_per_hour * (1 - it.tax_rate) * 4.34
}

interface NewIncomeTypeForm {
  name: string
  hours_per_week: string
  salary_per_hour: string
  tax_rate: string
}

function IncomeTypesTab() {
  const [items, setItems] = useState<IncomeType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddRow, setShowAddRow] = useState(false)
  const [newForm, setNewForm] = useState<NewIncomeTypeForm>({
    name: '', hours_per_week: '', salary_per_hour: '', tax_rate: '',
  })
  const [addError, setAddError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/income-types')
      const data = await res.json()
      if (Array.isArray(data)) setItems(data)
      else setError('Failed to load income types')
    } catch {
      setError('Failed to load income types')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function handlePatch(id: string, field: string, value: string) {
    const updates: Record<string, string | number> = {}
    if (field === 'name') updates.name = value
    else updates[field] = Number(value) || 0
    await fetch(`/api/income-types/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    await fetchItems()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this income type?')) return
    setDeleting(id)
    await fetch(`/api/income-types/${id}`, { method: 'DELETE' })
    await fetchItems()
    setDeleting(null)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError(null)
    if (!newForm.name.trim()) { setAddError('Name is required'); return }
    const res = await fetch('/api/income-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newForm.name,
        hours_per_week: Number(newForm.hours_per_week) || 0,
        salary_per_hour: Number(newForm.salary_per_hour) || 0,
        tax_rate: Number(newForm.tax_rate) || 0,
      }),
    })
    if (!res.ok) { const d = await res.json(); setAddError(d.error || 'Failed'); return }
    setNewForm({ name: '', hours_per_week: '', salary_per_hour: '', tax_rate: '' })
    setShowAddRow(false)
    await fetchItems()
  }

  if (loading) {
    return <div className="h-40 bg-[#F1F5F9] rounded-xl animate-pulse" />
  }
  if (error) {
    return <div className="text-[#DC2626] text-sm bg-[#FEF2F2] border border-red-200 rounded-lg px-4 py-3">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#64748B]">Click any cell to edit inline.</p>
        <button
          onClick={() => setShowAddRow(v => !v)}
          className="bg-[#1E3A8A] text-white hover:bg-[#172554] rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          {showAddRow ? 'Cancel' : '+ Add'}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="th">Name</th>
                <th className="th text-right">Hours/Week</th>
                <th className="th text-right">Salary/Hour</th>
                <th className="th text-right">Tax Rate</th>
                <th className="th text-right">Monthly Net</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id}>
                  <td className="td p-0 hover:bg-[#EFF6FF]">
                    <InlineEdit value={it.name} type="text" onSave={v => handlePatch(it.id, 'name', v)} className="px-4 py-2" />
                  </td>
                  <td className="td p-0 hover:bg-[#EFF6FF] text-right">
                    <InlineEdit value={it.hours_per_week} type="number" onSave={v => handlePatch(it.id, 'hours_per_week', v)} className="px-4 py-2" />
                  </td>
                  <td className="td p-0 hover:bg-[#EFF6FF] text-right">
                    <InlineEdit value={it.salary_per_hour} type="number" onSave={v => handlePatch(it.id, 'salary_per_hour', v)} className="px-4 py-2" format={v => v !== null ? `€ ${fmt(Number(v))}` : '—'} />
                  </td>
                  <td className="td p-0 hover:bg-[#EFF6FF] text-right">
                    <InlineEdit value={it.tax_rate} type="number" onSave={v => handlePatch(it.id, 'tax_rate', v)} className="px-4 py-2" format={v => v !== null ? `${(Number(v) * 100).toFixed(1)}%` : '—'} />
                  </td>
                  <td className="td text-right font-medium text-[#0F172A]">
                    € {fmt(incomeMonthlyNet(it))}
                  </td>
                  <td className="td">
                    <button
                      onClick={() => handleDelete(it.id)}
                      disabled={deleting === it.id}
                      className="text-[#DC2626] hover:text-red-800 text-xs font-medium disabled:opacity-40"
                    >
                      {deleting === it.id ? '…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}

              {/* Add Row */}
              {showAddRow && (
                <tr>
                  <td className="td" colSpan={6}>
                    <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
                      {addError && (
                        <div className="w-full text-[#DC2626] text-xs">{addError}</div>
                      )}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-[#64748B]">Name</label>
                        <input className="input text-sm" value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))} placeholder="Name" required />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-[#64748B]">Hours/Week</label>
                        <input className="input text-sm w-28" type="number" step="0.1" value={newForm.hours_per_week} onChange={e => setNewForm(p => ({ ...p, hours_per_week: e.target.value }))} placeholder="0" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-[#64748B]">Salary/Hour (€)</label>
                        <input className="input text-sm w-28" type="number" step="0.01" value={newForm.salary_per_hour} onChange={e => setNewForm(p => ({ ...p, salary_per_hour: e.target.value }))} placeholder="0.00" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-[#64748B]">Tax Rate (0–1)</label>
                        <input className="input text-sm w-24" type="number" step="0.01" min="0" max="1" value={newForm.tax_rate} onChange={e => setNewForm(p => ({ ...p, tax_rate: e.target.value }))} placeholder="0.00" />
                      </div>
                      <button type="submit" className="bg-[#1E3A8A] text-white hover:bg-[#172554] rounded-lg px-4 py-2 text-sm font-medium">Add</button>
                    </form>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Internships Tab ────────────────────────────────────────────────────────────

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

const EMPTY_INTERN_FORM: InternshipForm = {
  name: '', start_date: '', end_date: '', rent: '', food: '', fun: '',
  gym: '', transport: '', gross_salary: '', net_salary: '', support_papa: '', support_mama: '',
}

function internshipFromForm(f: InternshipForm): Record<string, string | number> {
  return {
    name: f.name,
    start_date: f.start_date,
    end_date: f.end_date,
    rent: Number(f.rent) || 0,
    food: Number(f.food) || 0,
    fun: Number(f.fun) || 0,
    gym: Number(f.gym) || 0,
    transport: Number(f.transport) || 0,
    gross_salary: Number(f.gross_salary) || 0,
    net_salary: Number(f.net_salary) || 0,
    support_papa: Number(f.support_papa) || 0,
    support_mama: Number(f.support_mama) || 0,
  }
}

function internshipToForm(i: Internship): InternshipForm {
  return {
    name: i.name,
    start_date: i.start_date,
    end_date: i.end_date,
    rent: String(i.rent),
    food: String(i.food),
    fun: String(i.fun),
    gym: String(i.gym),
    transport: String(i.transport),
    gross_salary: String(i.gross_salary),
    net_salary: String(i.net_salary),
    support_papa: String(i.support_papa),
    support_mama: String(i.support_mama),
  }
}

function getProrataBadges(internship: Internship): string[] {
  const start = internship.start_date
  const end = internship.end_date
  const [sy, sm] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  const totalMonths = (ey - sy) * 12 + (em - sm) + 1
  const months = generateMonthDates(start.slice(0, 7) + '-01', totalMonths)
  return months.map(m => {
    const ratio = getInternshipRatio(m, internship)
    if (ratio < 0.99) {
      return `${formatMonthLabel(m)} (${Math.round(ratio * 100)}%)`
    }
    return formatMonthLabel(m)
  })
}

function InternshipFormFields({
  form,
  set,
}: {
  form: InternshipForm
  set: (key: keyof InternshipForm, value: string) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2 flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[#0F172A]">Name</label>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[#0F172A]">Start Date</label>
        <input className="input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[#0F172A]">End Date</label>
        <input className="input" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} required />
      </div>
      {([
        ['rent', 'Rent (€/mo)'],
        ['food', 'Food (€/mo)'],
        ['fun', 'Fun (€/mo)'],
        ['gym', 'Gym (€/mo)'],
        ['transport', 'Transport (€/mo)'],
        ['gross_salary', 'Gross Salary (€/mo)'],
        ['net_salary', 'Net Salary (€/mo)'],
        ['support_papa', 'Support Papa (€/mo)'],
        ['support_mama', 'Support Mama (€/mo)'],
      ] as [keyof InternshipForm, string][]).map(([key, label]) => (
        <div key={key} className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#0F172A]">{label}</label>
          <input className="input" type="number" step="0.01" value={form[key]} onChange={e => set(key, e.target.value)} placeholder="0.00" />
        </div>
      ))}
    </div>
  )
}

function InternshipsTab() {
  const [items, setItems] = useState<Internship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Internship | null>(null)
  const [form, setForm] = useState<InternshipForm>(EMPTY_INTERN_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/internships')
      const data = await res.json()
      if (Array.isArray(data)) setItems(data)
      else setError('Failed to load internships')
    } catch {
      setError('Failed to load internships')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  function openAdd() {
    setEditTarget(null)
    setForm(EMPTY_INTERN_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(it: Internship) {
    setEditTarget(it)
    setForm(internshipToForm(it))
    setFormError(null)
    setModalOpen(true)
  }

  function setField(key: keyof InternshipForm, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const body = internshipFromForm(form)
      const url = editTarget ? `/api/internships/${editTarget.id}` : '/api/internships'
      const method = editTarget ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json()
        setFormError(d.error || 'Failed to save')
        return
      }
      setModalOpen(false)
      await fetchItems()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this internship?')) return
    setDeleting(id)
    await fetch(`/api/internships/${id}`, { method: 'DELETE' })
    await fetchItems()
    setDeleting(null)
  }

  if (loading) {
    return <div className="h-40 bg-[#F1F5F9] rounded-xl animate-pulse" />
  }
  if (error) {
    return <div className="text-[#DC2626] text-sm bg-[#FEF2F2] border border-red-200 rounded-lg px-4 py-3">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#64748B]">{items.length} internship{items.length !== 1 ? 's' : ''}</p>
        <button
          onClick={openAdd}
          className="bg-[#1E3A8A] text-white hover:bg-[#172554] rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          + Add Internship
        </button>
      </div>

      {items.length === 0 && (
        <div className="card p-8 text-center text-sm text-[#64748B]">
          No internships yet. Add one to get started.
        </div>
      )}

      <div className="space-y-4">
        {items.map(it => {
          const badges = getProrataBadges(it)
          const totalCost = it.rent + it.food + it.fun + it.gym + it.transport
          const totalSupport = it.support_papa + it.support_mama
          return (
            <div key={it.id} className="card p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="font-semibold text-[#0F172A] text-base">{it.name}</div>
                  <div className="text-sm text-[#64748B] mt-0.5">{it.start_date} — {it.end_date}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(it)}
                    className="text-[#1E3A8A] hover:text-[#172554] text-xs font-medium border border-[#1E3A8A] rounded-lg px-3 py-1.5 hover:bg-[#EFF6FF] transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(it.id)}
                    disabled={deleting === it.id}
                    className="text-[#DC2626] hover:text-red-800 text-xs font-medium border border-[#DC2626] rounded-lg px-3 py-1.5 hover:bg-[#FEF2F2] transition-colors disabled:opacity-40"
                  >
                    {deleting === it.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-[#F8FAFC] rounded-lg p-3">
                  <div className="text-xs text-[#64748B]">Net Salary/mo</div>
                  <div className="text-sm font-semibold text-[#0F172A]">€ {fmt(it.net_salary)}</div>
                </div>
                <div className="bg-[#F8FAFC] rounded-lg p-3">
                  <div className="text-xs text-[#64748B]">Gross Salary/mo</div>
                  <div className="text-sm font-semibold text-[#0F172A]">€ {fmt(it.gross_salary)}</div>
                </div>
                <div className="bg-[#F8FAFC] rounded-lg p-3">
                  <div className="text-xs text-[#64748B]">Total Costs/mo</div>
                  <div className="text-sm font-semibold text-[#DC2626]">€ {fmt(totalCost)}</div>
                </div>
                <div className="bg-[#F8FAFC] rounded-lg p-3">
                  <div className="text-xs text-[#64748B]">Support/mo</div>
                  <div className="text-sm font-semibold text-[#0F172A]">€ {fmt(totalSupport)}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {badges.map((b, i) => (
                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[#EFF6FF] text-[#1E3A8A] border border-[#BFDBFE]">
                    {b}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? `Edit: ${editTarget.name}` : 'Add Internship'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="text-[#DC2626] text-sm bg-[#FEF2F2] border border-red-200 rounded-lg px-4 py-3">{formError}</div>
          )}
          <InternshipFormFields form={form} set={setField} />
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#1E3A8A] text-white hover:bg-[#172554] rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {submitting ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Internship'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ─── Balance Tab ────────────────────────────────────────────────────────────────

interface BalanceItemForm {
  name: string
  amount: string
  category: string
  direction: string
  internship_id: string
}

const EMPTY_BALANCE_FORM: BalanceItemForm = {
  name: '', amount: '', category: 'Cash', direction: '+', internship_id: '',
}

const CATEGORIES: BalanceItem['category'][] = ['Cash', 'Receivables', 'Provision']

function BalanceTab() {
  const [items, setItems] = useState<BalanceItem[]>([])
  const [internships, setInternships] = useState<Internship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<BalanceItem | null>(null)
  const [form, setForm] = useState<BalanceItemForm>(EMPTY_BALANCE_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      const [balRes, intRes] = await Promise.all([
        fetch('/api/balance'),
        fetch('/api/internships'),
      ])
      const balData = await balRes.json()
      const intData = await intRes.json()
      if (Array.isArray(balData)) setItems(balData)
      else setError('Failed to load balance')
      if (Array.isArray(intData)) setInternships(intData)
    } catch {
      setError('Failed to load balance')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function openAdd() {
    setEditTarget(null)
    setForm(EMPTY_BALANCE_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(item: BalanceItem) {
    setEditTarget(item)
    setForm({
      name: item.name,
      amount: String(item.amount),
      category: item.category,
      direction: item.direction,
      internship_id: item.internship_id ?? '',
    })
    setFormError(null)
    setModalOpen(true)
  }

  function setField(key: keyof BalanceItemForm, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const body = {
        name: form.name,
        amount: Number(form.amount) || 0,
        category: form.category,
        direction: form.direction,
        internship_id: form.internship_id || null,
      }
      const url = editTarget ? `/api/balance/${editTarget.id}` : '/api/balance'
      const method = editTarget ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json()
        setFormError(d.error || 'Failed to save')
        return
      }
      setModalOpen(false)
      await fetchAll()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this balance item?')) return
    setDeleting(id)
    await fetch(`/api/balance/${id}`, { method: 'DELETE' })
    await fetchAll()
    setDeleting(null)
  }

  // Compute initial savings
  const initialSavings = items.reduce((acc, item) => {
    const amount = item.internship_id
      ? (() => {
          const intern = internships.find(i => i.id === item.internship_id)
          if (!intern) return item.amount
          const [sy, sm] = intern.start_date.split('-').map(Number)
          const [ey, em] = intern.end_date.split('-').map(Number)
          const months = (ey - sy) * 12 + (em - sm) + 1
          return intern.net_salary * months
        })()
      : item.amount
    return item.direction === '+' ? acc + amount : acc - amount
  }, 0)

  if (loading) {
    return <div className="h-40 bg-[#F1F5F9] rounded-xl animate-pulse" />
  }
  if (error) {
    return <div className="text-[#DC2626] text-sm bg-[#FEF2F2] border border-red-200 rounded-lg px-4 py-3">{error}</div>
  }

  const grouped = CATEGORIES.map(cat => ({
    category: cat,
    items: items.filter(i => i.category === cat),
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#64748B]">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        <button
          onClick={openAdd}
          className="bg-[#1E3A8A] text-white hover:bg-[#172554] rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          + Add
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="th">Name</th>
                <th className="th">Category</th>
                <th className="th">Direction</th>
                <th className="th text-right">Amount</th>
                <th className="th">Internship</th>
                <th className="th text-right">Effective Amount</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody>
              {grouped.map(({ category, items: catItems }) => (
                <>
                  {catItems.length > 0 && (
                    <tr key={`group-${category}`}>
                      <td colSpan={7} className="px-4 py-2 bg-[#F8FAFC] text-xs font-semibold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">
                        {category}
                      </td>
                    </tr>
                  )}
                  {catItems.map(item => {
                    const linkedInternship = internships.find(i => i.id === item.internship_id)
                    const effectiveAmount = linkedInternship
                      ? (() => {
                          const [sy, sm] = linkedInternship.start_date.split('-').map(Number)
                          const [ey, em] = linkedInternship.end_date.split('-').map(Number)
                          const months = (ey - sy) * 12 + (em - sm) + 1
                          return linkedInternship.net_salary * months
                        })()
                      : item.amount
                    return (
                      <tr key={item.id}>
                        <td className="td font-medium">{item.name}</td>
                        <td className="td text-[#64748B]">{item.category}</td>
                        <td className="td">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.direction === '+' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {item.direction}
                          </span>
                        </td>
                        <td className="td text-right">€ {fmt(item.amount)}</td>
                        <td className="td text-sm text-[#64748B]">
                          {linkedInternship ? linkedInternship.name : '—'}
                        </td>
                        <td className={`td text-right font-medium ${item.direction === '+' ? 'text-green-700' : 'text-[#DC2626]'}`}>
                          {item.direction}{' '}€ {fmt(effectiveAmount)}
                        </td>
                        <td className="td">
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(item)} className="text-[#1E3A8A] hover:text-[#172554] text-xs font-medium">Edit</button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              disabled={deleting === item.id}
                              className="text-[#DC2626] hover:text-red-800 text-xs font-medium disabled:opacity-40"
                            >
                              {deleting === item.id ? '…' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Initial Savings Total */}
      <div className="card p-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-[#0F172A]">Initial Savings</span>
        <span className={`text-lg font-bold ${initialSavings >= 0 ? 'text-green-700' : 'text-[#DC2626]'}`}>
          € {fmt(initialSavings)}
        </span>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? `Edit: ${editTarget.name}` : 'Add Balance Item'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="text-[#DC2626] text-sm bg-[#FEF2F2] border border-red-200 rounded-lg px-4 py-3">{formError}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#0F172A]">Name</label>
              <input className="input" value={form.name} onChange={e => setField('name', e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#0F172A]">Amount (€)</label>
              <input className="input" type="number" step="0.01" value={form.amount} onChange={e => setField('amount', e.target.value)} placeholder="0.00" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#0F172A]">Category</label>
              <select className="input" value={form.category} onChange={e => setField('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#0F172A]">Direction</label>
              <select className="input" value={form.direction} onChange={e => setField('direction', e.target.value)}>
                <option value="+">+ (Income)</option>
                <option value="-">- (Expense)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#0F172A]">Linked Internship</label>
              <select className="input" value={form.internship_id} onChange={e => setField('internship_id', e.target.value)}>
                <option value="">None</option>
                {internships.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#1E3A8A] text-white hover:bg-[#172554] rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {submitting ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ─── Settings Page ──────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'config', label: 'Config' },
  { key: 'income-types', label: 'Income Types' },
  { key: 'internships', label: 'Internships' },
  { key: 'balance', label: 'Balance' },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('config')

  return (
    <div className="p-6 md:p-8 max-w-screen-xl">
      <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Settings</h1>

      {/* Tab Bar */}
      <div className="flex border-b border-[#E2E8F0] mb-6 gap-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-[#1E3A8A] text-[#1E3A8A] font-semibold'
                : 'text-[#64748B] hover:text-[#0F172A] border-b-2 border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'config' && <ConfigTab />}
      {activeTab === 'income-types' && <IncomeTypesTab />}
      {activeTab === 'internships' && <InternshipsTab />}
      {activeTab === 'balance' && <BalanceTab />}
    </div>
  )
}
