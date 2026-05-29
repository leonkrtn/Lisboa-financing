'use client'
import { useEffect, useState, useCallback } from 'react'
import { fmt, computeIncomeForType } from '@/lib/calculations'
import type { Config, IncomeType, ExpenseCategory, Internship, InternshipExpenseOverride } from '@/types'
import Modal from '@/components/Modal'

type Tab = 'general' | 'income' | 'expenses' | 'internships'

export default function SetupPage() {
  const [tab, setTab] = useState<Tab>('general')

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto space-y-5">
      <h1 className="text-base font-semibold text-[#111827]">Einstellungen</h1>

      {/* Tab bar */}
      <div className="flex border-b border-[#E5E7EB]">
        {([
          { key: 'general', label: 'Allgemein' },
          { key: 'income', label: 'Einnahmearten' },
          { key: 'expenses', label: 'Ausgabenkategorien' },
          { key: 'internships', label: 'Internships' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-[#1E3A8A] text-[#1E3A8A]'
                : 'border-transparent text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && <GeneralSection />}
      {tab === 'income' && <IncomeSection />}
      {tab === 'expenses' && <ExpensesSection />}
      {tab === 'internships' && <InternshipsSection />}
    </div>
  )
}

// ─── General ─────────────────────────────────────────────────────────────────

function GeneralSection() {
  const [config, setConfig] = useState<Config>({})
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(d => { setConfig(d); setLoading(false) })
  }, [])

  async function save(key: string, value: string) {
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
    setConfig(c => ({ ...c, [key]: value }))
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  if (loading) return <Spinner />

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Planungszeitraum</p>
        {saved && <span className="text-xs text-[#059669]">Gespeichert</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">Startmonat</label>
          <input
            type="month"
            defaultValue={config.start_month?.slice(0, 7) ?? ''}
            onBlur={e => {
              if (e.target.value) save('start_month', e.target.value + '-01')
            }}
            className="field"
          />
          <p className="text-xs text-[#9CA3AF] mt-1">Monat, ab dem die Planung beginnt</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">Anzahl Monate</label>
          <input
            type="number"
            defaultValue={config.num_months ?? '24'}
            onBlur={e => save('num_months', e.target.value)}
            className="field"
            min="1"
            max="120"
          />
          <p className="text-xs text-[#9CA3AF] mt-1">Wie viele Monate vorausplanen</p>
        </div>
      </div>
    </div>
  )
}

// ─── Income Types ─────────────────────────────────────────────────────────────

function IncomeSection() {
  const [types, setTypes] = useState<IncomeType[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<IncomeType | null>(null)
  const [form, setForm] = useState<Partial<IncomeType>>({ type: 'hourly' })
  const [saving, setSaving] = useState(false)

  const fetch_ = useCallback(async () => {
    const r = await fetch('/api/income-types')
    setTypes(await r.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  function openNew() {
    setEditing(null)
    setForm({ type: 'hourly', hours_per_week: 0, salary_per_hour: 0, tax_rate: 0, manual_amount: 0 })
    setModalOpen(true)
  }

  function openEdit(t: IncomeType) {
    setEditing(t)
    setForm({ ...t })
    setModalOpen(true)
  }

  async function submit() {
    setSaving(true)
    const url = editing ? `/api/income-types/${editing.id}` : '/api/income-types'
    const method = editing ? 'PATCH' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setModalOpen(false)
    await fetch_()
    setSaving(false)
  }

  async function del(id: string) {
    if (!confirm('Einnahmenart löschen?')) return
    await fetch(`/api/income-types/${id}`, { method: 'DELETE' })
    await fetch_()
  }

  const preview = form.type === 'manual'
    ? form.manual_amount ?? 0
    : ((form.hours_per_week ?? 0) * (form.salary_per_hour ?? 0) * (1 - (form.tax_rate ?? 0)) * (52 / 12))

  if (loading) return <Spinner />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#6B7280]">{types.length} Einnahmenart{types.length !== 1 ? 'en' : ''} konfiguriert</p>
        <button onClick={openNew} className="btn-primary">+ Neue Einnahmenart</button>
      </div>

      {types.length === 0 && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-8 text-center text-sm text-[#9CA3AF]">
          Noch keine Einnahmearten. Füge deine erste hinzu.
        </div>
      )}

      <div className="space-y-2">
        {types.map(t => (
          <div key={t.id} className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-[#111827]">{t.name}</p>
              <p className="text-xs text-[#6B7280] mt-0.5">
                {t.type === 'manual'
                  ? `Manuell · € ${fmt(t.manual_amount)} / Monat`
                  : `${t.hours_per_week} h/Wo · € ${t.salary_per_hour}/h · ${Math.round((t.tax_rate || 0) * 100)}% Steuer`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold pos num">€ {fmt(computeIncomeForType(t))}</p>
              <p className="text-xs text-[#9CA3AF]">/ Monat netto</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => openEdit(t)} className="btn-ghost text-xs">Bearbeiten</button>
              <button onClick={() => del(t.id)} className="btn-ghost text-xs text-[#DC2626]">Löschen</button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Einnahmenart bearbeiten' : 'Neue Einnahmenart'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">Name</label>
            <input className="field" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Studentenjob" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">Typ</label>
            <div className="flex gap-2">
              {(['hourly', 'manual'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    form.type === t
                      ? 'border-[#1E3A8A] bg-[#EFF6FF] text-[#1E3A8A] font-medium'
                      : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'
                  }`}
                >
                  {t === 'hourly' ? 'Stundenbasiert' : 'Fester Betrag'}
                </button>
              ))}
            </div>
          </div>

          {form.type === 'hourly' ? (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Std / Woche</label>
                <input className="field" type="number" value={form.hours_per_week ?? ''} onChange={e => setForm(f => ({ ...f, hours_per_week: parseFloat(e.target.value) || 0 }))} min="0" step="0.5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">€ / Stunde</label>
                <input className="field" type="number" value={form.salary_per_hour ?? ''} onChange={e => setForm(f => ({ ...f, salary_per_hour: parseFloat(e.target.value) || 0 }))} min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Steuersatz %</label>
                <input className="field" type="number" value={form.tax_rate != null ? Math.round(form.tax_rate * 100) : ''} onChange={e => setForm(f => ({ ...f, tax_rate: (parseFloat(e.target.value) || 0) / 100 }))} min="0" max="100" />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Nettobetrag / Monat (€)</label>
              <input className="field" type="number" value={form.manual_amount ?? ''} onChange={e => setForm(f => ({ ...f, manual_amount: parseFloat(e.target.value) || 0 }))} min="0" step="0.01" />
            </div>
          )}

          <div className="rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] px-4 py-2.5 flex justify-between items-center">
            <span className="text-xs text-[#15803D]">Netto / Monat</span>
            <span className="text-sm font-bold pos num">€ {fmt(preview)}</span>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={submit} disabled={saving || !form.name} className="btn-primary flex-1">
              {saving ? 'Speichern…' : editing ? 'Änderungen speichern' : 'Erstellen'}
            </button>
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Abbruch</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Expense Categories ───────────────────────────────────────────────────────

const TYPE_LABELS: Record<ExpenseCategory['type'], string> = {
  monthly: 'Monatlich',
  daily: 'Pro Tag × Tage',
  once: 'Einmalig',
  yearly: 'Jährlich',
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

function ExpensesSection() {
  const [cats, setCats] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ExpenseCategory | null>(null)
  const [form, setForm] = useState<Partial<ExpenseCategory>>({ type: 'monthly' })
  const [saving, setSaving] = useState(false)

  const fetch_ = useCallback(async () => {
    const r = await fetch('/api/expense-categories')
    setCats(await r.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  function openNew() {
    setEditing(null)
    setForm({ type: 'monthly', default_amount: 0 })
    setModalOpen(true)
  }

  function openEdit(c: ExpenseCategory) {
    setEditing(c)
    setForm({ ...c })
    setModalOpen(true)
  }

  async function submit() {
    setSaving(true)
    const url = editing ? `/api/expense-categories/${editing.id}` : '/api/expense-categories'
    const method = editing ? 'PATCH' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        type: form.type,
        default_amount: form.default_amount ?? 0,
        once_month: form.type === 'once' ? (form.once_month ?? null) : null,
        yearly_month: form.type === 'yearly' ? (form.yearly_month ?? null) : null,
      }),
    })
    setModalOpen(false)
    await fetch_()
    setSaving(false)
  }

  async function del(id: string) {
    if (!confirm('Kategorie löschen? Das entfernt auch alle Internship-Überschreibungen für diese Kategorie.')) return
    await fetch(`/api/expense-categories/${id}`, { method: 'DELETE' })
    await fetch_()
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#6B7280]">{cats.length} Kategorie{cats.length !== 1 ? 'n' : ''}</p>
        <button onClick={openNew} className="btn-primary">+ Neue Kategorie</button>
      </div>

      {cats.length === 0 && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-8 text-center text-sm text-[#9CA3AF]">
          Noch keine Ausgabenkategorien. Füge z.B. Miete, Lebensmittel oder Versicherung hinzu.
        </div>
      )}

      <div className="space-y-2">
        {cats.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-[#111827]">{c.name}</p>
              <p className="text-xs text-[#6B7280] mt-0.5">
                {TYPE_LABELS[c.type]}
                {c.type === 'once' && c.once_month && ` · ${c.once_month.slice(0, 7)}`}
                {c.type === 'yearly' && c.yearly_month && ` · jeden ${MONTH_NAMES[(c.yearly_month - 1) % 12]}`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold neg num">€ {fmt(c.default_amount)}</p>
              <p className="text-xs text-[#9CA3AF]">
                {c.type === 'daily' ? '/ Tag' : '/ Monat'}
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => openEdit(c)} className="btn-ghost text-xs">Bearbeiten</button>
              <button onClick={() => del(c.id)} className="btn-ghost text-xs text-[#DC2626]">Löschen</button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Kategorie bearbeiten' : 'Neue Ausgabenkategorie'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">Name</label>
            <input className="field" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Miete, Lebensmittel, Versicherung…" />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-2">Typ</label>
            <div className="grid grid-cols-2 gap-2">
              {(['monthly', 'daily', 'once', 'yearly'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={`py-2 px-3 text-sm rounded-lg border transition-colors text-left ${
                    form.type === t
                      ? 'border-[#1E3A8A] bg-[#EFF6FF] text-[#1E3A8A] font-medium'
                      : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'
                  }`}
                >
                  <span className="block font-medium">{TYPE_LABELS[t]}</span>
                  <span className="block text-xs opacity-70">
                    {t === 'monthly' && 'Gleicher Betrag jeden Monat'}
                    {t === 'daily' && 'Betrag × Tage im Monat'}
                    {t === 'once' && 'Einmalig in einem bestimmten Monat'}
                    {t === 'yearly' && 'Einmal pro Jahr im gleichen Monat'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">
              {form.type === 'daily' ? 'Betrag pro Tag (€)' : 'Betrag (€)'}
            </label>
            <input className="field" type="number" value={form.default_amount ?? ''} onChange={e => setForm(f => ({ ...f, default_amount: parseFloat(e.target.value) || 0 }))} min="0" step="0.01" />
          </div>

          {form.type === 'once' && (
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">In welchem Monat?</label>
              <input
                type="month"
                className="field"
                value={form.once_month?.slice(0, 7) ?? ''}
                onChange={e => setForm(f => ({ ...f, once_month: e.target.value ? e.target.value + '-01' : null }))}
              />
            </div>
          )}

          {form.type === 'yearly' && (
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">In welchem Monat jedes Jahr?</label>
              <select className="field" value={form.yearly_month ?? ''} onChange={e => setForm(f => ({ ...f, yearly_month: parseInt(e.target.value) || null }))}>
                <option value="">Monat wählen…</option>
                {MONTH_NAMES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={submit} disabled={saving || !form.name} className="btn-primary flex-1">
              {saving ? 'Speichern…' : editing ? 'Änderungen speichern' : 'Erstellen'}
            </button>
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Abbruch</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Internships ──────────────────────────────────────────────────────────────

function InternshipsSection() {
  const [internships, setInternships] = useState<Internship[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [overrides, setOverrides] = useState<InternshipExpenseOverride[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [overrideModalId, setOverrideModalId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Internship | null>(null)
  const [form, setForm] = useState<Partial<Internship>>({ income_mode: 'manual' })
  const [overrideForm, setOverrideForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const fetch_ = useCallback(async () => {
    const [iRes, cRes, oRes] = await Promise.all([
      fetch('/api/internships'),
      fetch('/api/expense-categories'),
      fetch('/api/internship-overrides'),
    ])
    const [i, c, o] = await Promise.all([iRes.json(), cRes.json(), oRes.json()])
    setInternships(i)
    setCategories(c)
    setOverrides(o)
    setLoading(false)
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  function openNew() {
    setEditing(null)
    setForm({ income_mode: 'manual', manual_salary: 0, hours_per_week: 0, salary_per_hour: 0, tax_rate: 0 })
    setModalOpen(true)
  }

  function openEdit(intern: Internship) {
    setEditing(intern)
    setForm({ ...intern })
    setModalOpen(true)
  }

  function openOverrides(internId: string) {
    const existingOverrides = overrides.filter(o => o.internship_id === internId)
    const init: Record<string, string> = {}
    for (const cat of categories) {
      const found = existingOverrides.find(o => o.expense_category_id === cat.id)
      init[cat.id] = found ? String(found.amount) : ''
    }
    setOverrideForm(init)
    setOverrideModalId(internId)
  }

  async function submitInternship() {
    setSaving(true)
    const url = editing ? `/api/internships/${editing.id}` : '/api/internships'
    const method = editing ? 'PATCH' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setModalOpen(false)
    await fetch_()
    setSaving(false)
  }

  async function saveOverrides() {
    if (!overrideModalId) return
    setSaving(true)
    for (const [catId, val] of Object.entries(overrideForm)) {
      if (val === '' || val === undefined) {
        // Delete existing override if present
        const existing = overrides.find(
          o => o.internship_id === overrideModalId && o.expense_category_id === catId
        )
        if (existing) {
          await fetch(`/api/internship-overrides/${existing.id}`, { method: 'DELETE' })
        }
      } else {
        await fetch('/api/internship-overrides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            internship_id: overrideModalId,
            expense_category_id: catId,
            amount: parseFloat(val) || 0,
          }),
        })
      }
    }
    setOverrideModalId(null)
    await fetch_()
    setSaving(false)
  }

  async function del(id: string) {
    if (!confirm('Internship löschen?')) return
    await fetch(`/api/internships/${id}`, { method: 'DELETE' })
    await fetch_()
  }

  const internshipIncome = (intern: Internship) => {
    if (intern.income_mode === 'hourly') {
      return intern.hours_per_week * intern.salary_per_hour * (1 - intern.tax_rate) * (52 / 12)
    }
    return intern.manual_salary
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#6B7280]">{internships.length} Internship{internships.length !== 1 ? 's' : ''}</p>
        <button onClick={openNew} className="btn-primary">+ Neues Internship</button>
      </div>

      {categories.length === 0 && (
        <div className="rounded-lg bg-[#FFF7ED] border border-[#FED7AA] px-4 py-3 text-xs text-[#92400E]">
          Tipp: Erstelle zuerst Ausgabenkategorien, um Internship-Überschreibungen zu konfigurieren.
        </div>
      )}

      {internships.length === 0 && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-8 text-center text-sm text-[#9CA3AF]">
          Noch keine Internships konfiguriert.
        </div>
      )}

      <div className="space-y-2">
        {internships.map(intern => {
          const myOverrides = overrides.filter(o => o.internship_id === intern.id)
          return (
            <div key={intern.id} className="bg-white rounded-xl border border-[#E5E7EB] p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[#111827]">{intern.name}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    {intern.start_date} – {intern.end_date}
                  </p>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">
                    {intern.income_mode === 'hourly'
                      ? `${intern.hours_per_week} h/Wo · €${intern.salary_per_hour}/h · ${Math.round(intern.tax_rate * 100)}% Steuer`
                      : `Netto: € ${fmt(intern.manual_salary)} / Monat`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold pos num">€ {fmt(internshipIncome(intern))}</p>
                  <p className="text-xs text-[#9CA3AF]">/ Monat netto</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {categories.length > 0 && (
                    <button onClick={() => openOverrides(intern.id)} className="btn-ghost text-xs">
                      Ausgaben {myOverrides.length > 0 ? `(${myOverrides.length})` : ''}
                    </button>
                  )}
                  <button onClick={() => openEdit(intern)} className="btn-ghost text-xs">Bearbeiten</button>
                  <button onClick={() => del(intern.id)} className="btn-ghost text-xs text-[#DC2626]">Löschen</button>
                </div>
              </div>
              {myOverrides.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#F3F4F6] flex flex-wrap gap-2">
                  {myOverrides.map(o => {
                    const cat = categories.find(c => c.id === o.expense_category_id)
                    return cat ? (
                      <span key={o.id} className="text-xs bg-[#EFF6FF] text-[#1E3A8A] rounded px-2 py-0.5">
                        {cat.name}: € {fmt(o.amount)}
                      </span>
                    ) : null
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Internship form modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Internship bearbeiten' : 'Neues Internship'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">Name</label>
            <input className="field" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Erasmus Madrid" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Startdatum</label>
              <input type="date" className="field" value={form.start_date ?? ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Enddatum</label>
              <input type="date" className="field" value={form.end_date ?? ''} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-2">Einnahmen während Internship</label>
            <div className="flex gap-2 mb-3">
              {(['manual', 'hourly'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setForm(f => ({ ...f, income_mode: m }))}
                  className={`flex-1 py-1.5 text-sm rounded-lg border transition-colors ${
                    form.income_mode === m
                      ? 'border-[#1E3A8A] bg-[#EFF6FF] text-[#1E3A8A] font-medium'
                      : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'
                  }`}
                >
                  {m === 'manual' ? 'Fester Nettobetrag' : 'Stundenbasiert'}
                </button>
              ))}
            </div>
            {form.income_mode === 'manual' ? (
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Netto / Monat (€)</label>
                <input className="field" type="number" value={form.manual_salary ?? ''} onChange={e => setForm(f => ({ ...f, manual_salary: parseFloat(e.target.value) || 0 }))} min="0" step="0.01" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Std / Woche</label>
                  <input className="field" type="number" value={form.hours_per_week ?? ''} onChange={e => setForm(f => ({ ...f, hours_per_week: parseFloat(e.target.value) || 0 }))} min="0" step="0.5" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">€ / Stunde</label>
                  <input className="field" type="number" value={form.salary_per_hour ?? ''} onChange={e => setForm(f => ({ ...f, salary_per_hour: parseFloat(e.target.value) || 0 }))} min="0" step="0.01" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Steuer %</label>
                  <input className="field" type="number" value={form.tax_rate != null ? Math.round(form.tax_rate * 100) : ''} onChange={e => setForm(f => ({ ...f, tax_rate: (parseFloat(e.target.value) || 0) / 100 }))} min="0" max="100" />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={submitInternship} disabled={saving || !form.name || !form.start_date || !form.end_date} className="btn-primary flex-1">
              {saving ? 'Speichern…' : editing ? 'Änderungen speichern' : 'Erstellen'}
            </button>
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Abbruch</button>
          </div>
        </div>
      </Modal>

      {/* Expense overrides modal */}
      <Modal
        open={!!overrideModalId}
        onClose={() => setOverrideModalId(null)}
        title="Ausgaben während Internship"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#6B7280]">
            Überschreibe Ausgabenkategorien für diesen Internship-Zeitraum. Leere Felder verwenden den Standardwert.
          </p>
          <div className="space-y-3">
            {categories.filter(c => c.type === 'monthly' || c.type === 'daily').map(cat => (
              <div key={cat.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#111827]">{cat.name}</p>
                  <p className="text-xs text-[#9CA3AF]">
                    Standard: € {fmt(cat.default_amount)} {cat.type === 'daily' ? '/ Tag' : '/ Monat'}
                  </p>
                </div>
                <input
                  className="field w-32 text-right"
                  type="number"
                  value={overrideForm[cat.id] ?? ''}
                  onChange={e => setOverrideForm(f => ({ ...f, [cat.id]: e.target.value }))}
                  placeholder="Kein Override"
                  min="0"
                  step="0.01"
                />
              </div>
            ))}
            {categories.filter(c => c.type === 'monthly' || c.type === 'daily').length === 0 && (
              <p className="text-sm text-[#9CA3AF]">Keine monthly/daily Kategorien vorhanden.</p>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={saveOverrides} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Speichern…' : 'Überschreibungen speichern'}
            </button>
            <button onClick={() => setOverrideModalId(null)} className="btn-secondary">Abbruch</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Spinner() {
  return <div className="flex h-32 items-center justify-center text-sm text-[#9CA3AF]">Laden…</div>
}
