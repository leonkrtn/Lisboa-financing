'use client'
import { useEffect, useState } from 'react'
import { fmt } from '@/lib/calculations'
import type { Config, IncomeType, Internship, BalanceItem } from '@/types'
import Modal from '@/components/Modal'

// ─── Config section ───────────────────────────────────────────────────────────

function ConfigSection({ config, onChange }: { config: Config; onChange: (key: string, value: string) => void }) {
  function field(key: string, label: string, type: 'number' | 'text' = 'number', extra?: string) {
    return (
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">{label}</label>
        <input
          type={type}
          defaultValue={config[key] ?? ''}
          onBlur={e => onChange(key, e.target.value)}
          className="field"
          step={type === 'number' ? 'any' : undefined}
          {...(extra ? { placeholder: extra } : {})}
        />
      </div>
    )
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-[#111827] mb-4">Configuration</h2>
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-5 space-y-5">

        {/* Planning horizon */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-3">Planning Horizon</p>
          <div className="grid grid-cols-2 gap-4">
            {field('start_month', 'Start Month', 'text', 'YYYY-MM-DD')}
            {field('num_months', 'Number of Months')}
          </div>
        </div>

        {/* Living costs */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-3">Monthly Living Costs</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {field('rent', 'Rent (€)')}
            {field('food_per_day', 'Food per Day (€)')}
            {field('fun_per_day', 'Fun per Day (€)')}
            {field('other_monthly', 'Other Monthly (€)')}
          </div>
        </div>

        {/* Support */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-3">Support Received</p>
          <div className="grid grid-cols-2 gap-4">
            {field('support_papa', 'Support Papa (€)')}
            {field('support_mama', 'Support Mama (€)')}
          </div>
        </div>

        {/* Insurance & flights */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-3">Insurance & Flights</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {field('insurance', 'Insurance (€/mo)')}
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Insurance Active</label>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.insurance_active === 'true'}
                  onChange={e => onChange('insurance_active', e.target.checked ? 'true' : 'false')}
                  className="w-4 h-4 accent-[#1E3A8A]"
                />
                <span className="text-sm text-[#111827]">Active</span>
              </label>
            </div>
            {field('flight_price', 'Flight Price (€)')}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Income types section ─────────────────────────────────────────────────────

function IncomeTypesSection({
  incomeTypes, onAdd, onDelete,
}: {
  incomeTypes: IncomeType[]
  onAdd: (it: Omit<IncomeType, 'id'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const empty = { name: '', hours_per_week: 0, salary_per_hour: 0, tax_rate: 0 }
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!form.name.trim()) return
    setSaving(true)
    await onAdd(form)
    setForm(empty)
    setOpen(false)
    setSaving(false)
  }

  const netPerMonth = (it: IncomeType) =>
    it.hours_per_week * it.salary_per_hour * (1 - it.tax_rate) * 4.34

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#111827]">Income Types</h2>
        <button onClick={() => setOpen(true)} className="btn-primary">+ Add</button>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        {incomeTypes.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] p-4">No income types yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Name', 'Hours/Week', '€/Hour', 'Tax %', 'Net/Month', ''].map(h => (
                  <th key={h} className={`t-head px-4 py-2 ${h === '' ? 'text-right' : h === 'Name' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incomeTypes.map(it => (
                <tr key={it.id} className="t-row">
                  <td className="t-cell px-4 py-2 font-medium">{it.name}</td>
                  <td className="t-cell px-4 py-2 num text-right">{it.hours_per_week}</td>
                  <td className="t-cell px-4 py-2 num text-right">{fmt(it.salary_per_hour)}</td>
                  <td className="t-cell px-4 py-2 num text-right">{(it.tax_rate * 100).toFixed(1)}%</td>
                  <td className="t-cell px-4 py-2 num text-right pos font-semibold">€{fmt(netPerMonth(it))}</td>
                  <td className="t-cell px-4 py-2 text-right">
                    <button
                      onClick={() => onDelete(it.id)}
                      className="btn-ghost text-[#DC2626] hover:text-[#DC2626] hover:bg-[#FEE2E2] text-xs px-2 py-0.5"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Income Type">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">Name</label>
            <input
              autoFocus
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="field"
              placeholder="e.g. Student Job"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Hours/Week</label>
              <input
                type="number"
                value={form.hours_per_week || ''}
                onChange={e => setForm(f => ({ ...f, hours_per_week: parseFloat(e.target.value) || 0 }))}
                className="field"
                step="any"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">€/Hour</label>
              <input
                type="number"
                value={form.salary_per_hour || ''}
                onChange={e => setForm(f => ({ ...f, salary_per_hour: parseFloat(e.target.value) || 0 }))}
                className="field"
                step="any"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Tax Rate (0–1)</label>
              <input
                type="number"
                value={form.tax_rate || ''}
                onChange={e => setForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) || 0 }))}
                className="field"
                step="0.01"
                min="0"
                max="1"
              />
            </div>
          </div>
          <div className="pt-1 text-xs text-[#6B7280]">
            Net/month: <span className="font-semibold text-[#059669]">
              €{fmt(form.hours_per_week * form.salary_per_hour * (1 - form.tax_rate) * 4.34)}
            </span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={submit} disabled={saving || !form.name.trim()} className="btn-primary">
              {saving ? 'Saving…' : 'Add'}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  )
}

// ─── Internships section ──────────────────────────────────────────────────────

const INTERN_EMPTY: Omit<Internship, 'id'> = {
  name: '', start_date: '', end_date: '',
  rent: 0, food: 0, fun: 0, gym: 0, transport: 0,
  gross_salary: 0, net_salary: 0, support_papa: 0, support_mama: 0,
}

function InternshipsSection({
  internships, onAdd, onDelete,
}: {
  internships: Internship[]
  onAdd: (intern: Omit<Internship, 'id'>) => Promise<string | null>
  onDelete: (id: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Omit<Internship, 'id'>>(INTERN_EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function n(key: keyof Omit<Internship, 'id' | 'name' | 'start_date' | 'end_date'>) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))
  }

  async function submit() {
    if (!form.name.trim() || !form.start_date || !form.end_date) return
    setSaving(true)
    setError('')
    const err = await onAdd(form)
    setSaving(false)
    if (err) { setError(err); return }
    setForm(INTERN_EMPTY)
    setOpen(false)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#111827]">Internships</h2>
        <button onClick={() => { setForm(INTERN_EMPTY); setError(''); setOpen(true) }} className="btn-primary">+ Add</button>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        {internships.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] p-4">No internships yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Name', 'From', 'To', 'Net/Mo', 'Rent', 'Food', 'Fun', 'Gym+Trans', 'Support', ''].map(h => (
                  <th key={h} className={`t-head px-3 py-2 whitespace-nowrap ${h === 'Name' || h === '' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {internships.map(it => (
                <tr key={it.id} className="t-row">
                  <td className="t-cell px-3 py-2 font-medium whitespace-nowrap">{it.name}</td>
                  <td className="t-cell px-3 py-2 num text-right whitespace-nowrap">{it.start_date}</td>
                  <td className="t-cell px-3 py-2 num text-right whitespace-nowrap">{it.end_date}</td>
                  <td className="t-cell px-3 py-2 num text-right pos font-semibold">€{fmt(it.net_salary)}</td>
                  <td className="t-cell px-3 py-2 num text-right neg">€{fmt(it.rent)}</td>
                  <td className="t-cell px-3 py-2 num text-right neg">€{fmt(it.food)}</td>
                  <td className="t-cell px-3 py-2 num text-right neg">€{fmt(it.fun)}</td>
                  <td className="t-cell px-3 py-2 num text-right neg">€{fmt(it.gym + it.transport)}</td>
                  <td className="t-cell px-3 py-2 num text-right pos">€{fmt(it.support_papa + it.support_mama)}</td>
                  <td className="t-cell px-3 py-2 text-right">
                    <button
                      onClick={() => onDelete(it.id)}
                      className="btn-ghost text-[#DC2626] hover:bg-[#FEE2E2] text-xs px-2 py-0.5"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Internship">
        <div className="space-y-4">
          {error && <p className="text-xs text-[#DC2626] bg-[#FEE2E2] rounded p-2">{error}</p>}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3">
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Name</label>
              <input
                autoFocus
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="field"
                placeholder="e.g. Acme Corp"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">End Date</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="field" />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-2">Salary</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Gross Salary (€/mo)</label>
                <input type="number" value={form.gross_salary || ''} onChange={n('gross_salary')} className="field" step="any" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Net Salary (€/mo)</label>
                <input type="number" value={form.net_salary || ''} onChange={n('net_salary')} className="field" step="any" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-2">Monthly Costs</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['rent', 'Rent (€)'],
                ['food', 'Food (€)'],
                ['fun', 'Fun (€)'],
                ['gym', 'Gym (€)'],
                ['transport', 'Transport (€)'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">{label}</label>
                  <input
                    type="number"
                    value={form[key as keyof typeof form] as number || ''}
                    onChange={n(key as keyof Omit<Internship, 'id' | 'name' | 'start_date' | 'end_date'>)}
                    className="field"
                    step="any"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-2">Support Received</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Support Papa (€)</label>
                <input type="number" value={form.support_papa || ''} onChange={n('support_papa')} className="field" step="any" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Support Mama (€)</label>
                <input type="number" value={form.support_mama || ''} onChange={n('support_mama')} className="field" step="any" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
            <button
              onClick={submit}
              disabled={saving || !form.name.trim() || !form.start_date || !form.end_date}
              className="btn-primary"
            >
              {saving ? 'Saving…' : 'Add Internship'}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  )
}

// ─── Balance section ──────────────────────────────────────────────────────────

const BAL_EMPTY: Omit<BalanceItem, 'id'> = {
  name: '', amount: 0, category: 'Cash', direction: '+', internship_id: null,
}

function BalanceSection({
  balance, internships, onAdd, onDelete,
}: {
  balance: BalanceItem[]
  internships: Internship[]
  onAdd: (b: Omit<BalanceItem, 'id'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Omit<BalanceItem, 'id'>>(BAL_EMPTY)
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!form.name.trim()) return
    setSaving(true)
    await onAdd(form)
    setForm(BAL_EMPTY)
    setOpen(false)
    setSaving(false)
  }

  const total = balance.reduce((s, b) => b.direction === '+' ? s + b.amount : s - b.amount, 0)

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-[#111827]">Balance Items</h2>
          <p className="text-xs text-[#6B7280]">Initial financial state — defines starting savings</p>
        </div>
        <button onClick={() => { setForm(BAL_EMPTY); setOpen(true) }} className="btn-primary">+ Add</button>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        {balance.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] p-4">No balance items yet.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Name', 'Category', '+/–', 'Amount', 'Linked Internship', ''].map(h => (
                    <th key={h} className={`t-head px-4 py-2 ${h === 'Amount' ? 'text-right' : h === '' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {balance.map(b => {
                  const linked = b.internship_id ? internships.find(i => i.id === b.internship_id) : null
                  return (
                    <tr key={b.id} className="t-row">
                      <td className="t-cell px-4 py-2 font-medium">{b.name}</td>
                      <td className="t-cell px-4 py-2 text-[#6B7280]">{b.category}</td>
                      <td className={`t-cell px-4 py-2 font-bold ${b.direction === '+' ? 'pos' : 'neg'}`}>{b.direction}</td>
                      <td className={`t-cell px-4 py-2 num text-right font-semibold ${b.direction === '+' ? 'pos' : 'neg'}`}>
                        €{fmt(b.amount)}
                      </td>
                      <td className="t-cell px-4 py-2 text-[#6B7280] text-xs">
                        {linked ? (
                          <span className="bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">{linked.name}</span>
                        ) : '—'}
                      </td>
                      <td className="t-cell px-4 py-2 text-right">
                        <button
                          onClick={() => onDelete(b.id)}
                          className="btn-ghost text-[#DC2626] hover:bg-[#FEE2E2] text-xs px-2 py-0.5"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-xs text-[#6B7280]">Total starting balance</span>
              <span className={`text-sm font-bold num ${total >= 0 ? 'pos' : 'neg'}`}>
                {total < 0 ? '–' : ''}€{fmt(Math.abs(total))}
              </span>
            </div>
          </>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Balance Item">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">Name</label>
            <input
              autoFocus
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="field"
              placeholder="e.g. Savings account"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as BalanceItem['category'] }))}
                className="field"
              >
                <option value="Cash">Cash</option>
                <option value="Receivables">Receivables</option>
                <option value="Provision">Provision</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Direction</label>
              <select
                value={form.direction}
                onChange={e => setForm(f => ({ ...f, direction: e.target.value as '+' | '-' }))}
                className="field"
              >
                <option value="+">+ (Asset / Income)</option>
                <option value="-">– (Liability / Cost)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">Amount (€)</label>
            <input
              type="number"
              value={form.amount || ''}
              onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
              className="field"
              step="any"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">
              Linked Internship <span className="font-normal text-[#9CA3AF]">(optional — uses total internship income instead of amount)</span>
            </label>
            <select
              value={form.internship_id ?? ''}
              onChange={e => setForm(f => ({ ...f, internship_id: e.target.value || null }))}
              className="field"
            >
              <option value="">None</option>
              {internships.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={submit} disabled={saving || !form.name.trim()} className="btn-primary">
              {saving ? 'Saving…' : 'Add'}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SetupPage() {
  const [config, setConfig] = useState<Config>({})
  const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>([])
  const [internships, setInternships] = useState<Internship[]>([])
  const [balance, setBalance] = useState<BalanceItem[]>([])
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    const [cfg, it, intern, bal] = await Promise.all([
      fetch('/api/config').then(r => r.json()),
      fetch('/api/income-types').then(r => r.json()),
      fetch('/api/internships').then(r => r.json()),
      fetch('/api/balance').then(r => r.json()),
    ])
    setConfig(cfg)
    setIncomeTypes(it)
    setInternships(intern)
    setBalance(bal)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  async function saveConfig(key: string, value: string) {
    setConfig(c => ({ ...c, [key]: value }))
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
  }

  async function addIncomeType(it: Omit<IncomeType, 'id'>) {
    await fetch('/api/income-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(it),
    })
    const data = await fetch('/api/income-types').then(r => r.json())
    setIncomeTypes(data)
  }

  async function deleteIncomeType(id: string) {
    await fetch(`/api/income-types/${id}`, { method: 'DELETE' })
    setIncomeTypes(prev => prev.filter(it => it.id !== id))
  }

  async function addInternship(intern: Omit<Internship, 'id'>): Promise<string | null> {
    const res = await fetch('/api/internships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intern),
    })
    if (!res.ok) {
      const json = await res.json()
      return json.error ?? 'Error'
    }
    const data = await fetch('/api/internships').then(r => r.json())
    setInternships(data)
    return null
  }

  async function deleteInternship(id: string) {
    await fetch(`/api/internships/${id}`, { method: 'DELETE' })
    setInternships(prev => prev.filter(i => i.id !== id))
  }

  async function addBalance(b: Omit<BalanceItem, 'id'>) {
    await fetch('/api/balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(b),
    })
    const data = await fetch('/api/balance').then(r => r.json())
    setBalance(data)
  }

  async function deleteBalance(id: string) {
    await fetch(`/api/balance/${id}`, { method: 'DELETE' })
    setBalance(prev => prev.filter(b => b.id !== id))
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-sm text-[#9CA3AF]">Loading…</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10">
      <ConfigSection config={config} onChange={saveConfig} />
      <IncomeTypesSection incomeTypes={incomeTypes} onAdd={addIncomeType} onDelete={deleteIncomeType} />
      <InternshipsSection internships={internships} onAdd={addInternship} onDelete={deleteInternship} />
      <BalanceSection balance={balance} internships={internships} onAdd={addBalance} onDelete={deleteBalance} />
    </div>
  )
}
