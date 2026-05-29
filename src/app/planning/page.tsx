'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import type { CalculatedMonth, ExpenseCategory, IncomeType } from '@/types'
import { fmt } from '@/lib/calculations'
import Modal from '@/components/Modal'

interface CalcResponse {
  months: CalculatedMonth[]
  expense_categories: ExpenseCategory[]
  net_capital: number
}

type IncomeEditMode = 'type' | 'manual' | 'none'

const TYPE_LABELS: Record<ExpenseCategory['type'], string> = {
  monthly: 'Monatlich',
  daily: 'Pro Tag × Tage',
  once: 'Einmalig',
  yearly: 'Jährlich',
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

export default function PlanningPage() {
  const [data, setData] = useState<CalcResponse | null>(null)
  const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>([])
  const [loading, setLoading] = useState(true)

  // Income inline editor
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<IncomeEditMode>('none')
  const [editTypeId, setEditTypeId] = useState<string>('')
  const [editManual, setEditManual] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const editRef = useRef<HTMLDivElement>(null)

  // Month detail modal
  const [detailMonth, setDetailMonth] = useState<CalculatedMonth | null>(null)

  // Category management modal
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [catEditing, setCatEditing] = useState<ExpenseCategory | null>(null)
  const [catForm, setCatForm] = useState<Partial<ExpenseCategory>>({ type: 'monthly' })
  const [catSaving, setCatSaving] = useState(false)
  const [showCatForm, setShowCatForm] = useState(false)

  const fetchData = useCallback(async () => {
    const [calcRes, typesRes] = await Promise.all([
      fetch('/api/calculated'),
      fetch('/api/income-types'),
    ])
    const [calc, types] = await Promise.all([calcRes.json(), typesRes.json()])
    setData(calc)
    setIncomeTypes(Array.isArray(types) ? types : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!editingDate) return
    function handleClick(e: MouseEvent) {
      if (editRef.current && !editRef.current.contains(e.target as Node)) setEditingDate(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [editingDate])

  function openEditor(month: CalculatedMonth) {
    setEditingDate(month.month_date)
    const md = month.month_data
    if (md?.manual_salary != null) {
      setEditMode('manual'); setEditManual(String(md.manual_salary)); setEditTypeId('')
    } else if (md?.income_type_id) {
      setEditMode('type'); setEditTypeId(md.income_type_id); setEditManual('')
    } else {
      setEditMode('none'); setEditTypeId(''); setEditManual('')
    }
  }

  async function saveIncome(monthDate: string) {
    setSaving(true)
    const body: Record<string, unknown> = { month_date: monthDate }
    if (editMode === 'type') { body.income_type_id = editTypeId || null; body.manual_salary = null }
    else if (editMode === 'manual') { body.manual_salary = parseFloat(editManual) || 0; body.income_type_id = null }
    else { body.income_type_id = null; body.manual_salary = null }
    await fetch('/api/month-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setEditingDate(null)
    await fetchData()
    setSaving(false)
  }

  // Category management
  function openNewCat() {
    setCatEditing(null)
    setCatForm({ type: 'monthly', default_amount: 0 })
    setShowCatForm(true)
  }

  function openEditCat(c: ExpenseCategory) {
    setCatEditing(c)
    setCatForm({ ...c })
    setShowCatForm(true)
  }

  async function saveCat() {
    setCatSaving(true)
    const url = catEditing ? `/api/expense-categories/${catEditing.id}` : '/api/expense-categories'
    const method = catEditing ? 'PATCH' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: catForm.name,
        type: catForm.type,
        default_amount: catForm.default_amount ?? 0,
        once_month: catForm.type === 'once' ? (catForm.once_month ?? null) : null,
        yearly_month: catForm.type === 'yearly' ? (catForm.yearly_month ?? null) : null,
        start_month: (catForm.type === 'monthly' || catForm.type === 'daily') ? (catForm.start_month ?? null) : null,
      }),
    })
    setShowCatForm(false)
    setCatEditing(null)
    await fetchData()
    setCatSaving(false)
  }

  async function deleteCat(id: string) {
    if (!confirm('Kategorie löschen? Alle Daten dieser Kategorie werden entfernt.')) return
    await fetch(`/api/expense-categories/${id}`, { method: 'DELETE' })
    await fetchData()
  }

  if (loading) return <Center>Laden…</Center>

  const months = data?.months ?? []
  const categories = data?.expense_categories ?? []

  if (!months.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2 text-sm text-[#6B7280]">
        <p>Keine Monate – konfiguriere zuerst den Planungszeitraum in den Einstellungen.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-full space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-[#111827]">Ausgabenplanung</h1>
        <button
          onClick={() => { setCatModalOpen(true); setShowCatForm(false) }}
          className="btn-secondary text-xs flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Kategorien ({categories.length})
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="w-full text-sm border-separate border-spacing-0"
            style={{ minWidth: `${300 + categories.length * 120 + 220}px` }}
          >
            <thead>
              <tr>
                <th className="t-head px-4 py-3 text-left sticky left-0 z-10 bg-[#F9FAFB] whitespace-nowrap">
                  Monat
                </th>
                <th className="t-head px-4 py-3 text-right whitespace-nowrap">Einnahmen</th>
                {categories.map(cat => (
                  <th
                    key={cat.id}
                    className="t-head px-4 py-3 text-right whitespace-nowrap group cursor-pointer hover:bg-[#EFF6FF] transition-colors"
                    onClick={() => { openEditCat(cat); setCatModalOpen(true) }}
                    title="Klicken zum Bearbeiten"
                  >
                    {cat.name}
                    <span className="block font-normal normal-case tracking-normal text-[#9CA3AF] text-[11px]">
                      {cat.type === 'daily' ? '/ Tag' : cat.type === 'once' ? 'Einmalig' : cat.type === 'yearly' ? 'Jährlich' : '/ Mo'}
                      {cat.start_month && cat.type === 'monthly' && (
                        <> · ab {cat.start_month.slice(0, 7)}</>
                      )}
                    </span>
                  </th>
                ))}
                <th className="t-head px-4 py-3 text-right whitespace-nowrap">Ergebnis</th>
                <th className="t-head px-4 py-3 text-right whitespace-nowrap">Kumuliert</th>
                <th className="t-head px-3 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {months.map((month, idx) => {
                const isEditing = editingDate === month.month_date
                const isInternship = !!month.internship
                const isLast = idx === months.length - 1
                return (
                  <tr key={month.month_date} className={`t-row group ${isInternship ? 'bg-amber-50' : ''}`}>
                    <td
                      className={`t-cell px-4 py-2.5 font-medium whitespace-nowrap sticky left-0 z-10 ${isLast ? 'border-b-0' : ''} ${isInternship ? 'bg-amber-50' : 'bg-white'}`}
                      style={{ borderRight: '1px solid #E5E7EB' }}
                    >
                      <div className="flex items-center gap-2">
                        <span>{month.label}</span>
                        {isInternship && (
                          <span className="text-xs bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 font-medium">
                            {month.internship!.name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Income — editable */}
                    <td className={`t-cell px-2 py-1.5 text-right ${isLast ? 'border-b-0' : ''}`}>
                      {isEditing ? (
                        <div ref={editRef} className="inline-flex flex-col gap-1.5 items-end text-left min-w-[220px]">
                          <input
                            className="field text-xs w-full"
                            type="number"
                            value={editManual}
                            onChange={e => { setEditManual(e.target.value); setEditMode('manual') }}
                            placeholder="Nettobetrag €"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveIncome(month.month_date)
                              if (e.key === 'Escape') setEditingDate(null)
                            }}
                          />
                          {incomeTypes.length > 0 && (
                            <select
                              className="field text-xs w-full"
                              value={editMode === 'type' ? editTypeId : ''}
                              onChange={e => {
                                if (e.target.value) { setEditMode('type'); setEditTypeId(e.target.value); setEditManual('') }
                                else { setEditMode('none'); setEditTypeId('') }
                              }}
                            >
                              <option value="">– Einnahmenart wählen (optional) –</option>
                              {incomeTypes.map(it => (
                                <option key={it.id} value={it.id}>{it.name}</option>
                              ))}
                            </select>
                          )}
                          <div className="flex gap-1.5">
                            <button onClick={() => saveIncome(month.month_date)} disabled={saving} className="btn-primary text-xs px-3 py-1.5">
                              {saving ? '…' : 'Speichern'}
                            </button>
                            <button onClick={() => setEditingDate(null)} className="btn-secondary text-xs px-3 py-1.5">Abbruch</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => openEditor(month)}
                          className="editable rounded-lg px-2 py-1.5 text-right w-full"
                          title="Klicken zum Bearbeiten"
                        >
                          <span className={`num font-medium ${month.income > 0 ? 'pos' : 'text-[#9CA3AF]'}`}>
                            {month.income > 0 ? `€ ${fmt(month.income)}` : '–'}
                          </span>
                          {month.income_label !== '–' && (
                            <span className="block text-xs text-[#9CA3AF]">{month.income_label}</span>
                          )}
                        </button>
                      )}
                    </td>

                    {/* Expense cells */}
                    {month.expenses.map(exp => (
                      <td key={exp.category_id} className={`t-cell px-4 py-2.5 text-right ${isLast ? 'border-b-0' : ''}`}>
                        <span className={`num ${exp.amount > 0 ? 'neg' : 'text-[#D1D5DB]'}`}>
                          {exp.amount > 0 ? `€ ${fmt(exp.amount)}` : '–'}
                        </span>
                      </td>
                    ))}

                    {/* Result */}
                    <td className={`t-cell px-4 py-2.5 text-right font-semibold num ${isLast ? 'border-b-0' : ''} ${month.result >= 0 ? 'pos' : 'neg'}`}>
                      {month.result >= 0 ? '+' : '–'}€ {fmt(Math.abs(month.result))}
                    </td>

                    {/* Cumulative */}
                    <td className={`t-cell px-4 py-2.5 text-right font-bold num ${isLast ? 'border-b-0' : ''} ${month.cumulative >= 0 ? 'pos' : 'neg'}`}>
                      € {fmt(month.cumulative)}
                    </td>

                    {/* Details */}
                    <td className={`t-cell px-2 py-2 ${isLast ? 'border-b-0' : ''}`}>
                      <button
                        onClick={() => setDetailMonth(month)}
                        className="text-xs text-[#9CA3AF] hover:text-[#1E3A8A] px-2 py-1 rounded-lg hover:bg-[#EFF6FF] transition-colors whitespace-nowrap"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Month detail modal */}
      <Modal open={!!detailMonth} onClose={() => setDetailMonth(null)} title={detailMonth?.label ?? ''}>
        {detailMonth && <MonthDetail month={detailMonth} />}
      </Modal>

      {/* Category management modal */}
      <Modal
        open={catModalOpen}
        onClose={() => { setCatModalOpen(false); setShowCatForm(false); setCatEditing(null) }}
        title="Ausgabenkategorien"
      >
        {showCatForm ? (
          <CategoryForm
            form={catForm}
            editing={catEditing}
            saving={catSaving}
            onChange={setCatForm}
            onSave={saveCat}
            onCancel={() => { setShowCatForm(false); setCatEditing(null) }}
          />
        ) : (
          <div className="space-y-3">
            {categories.length === 0 && (
              <p className="text-sm text-[#9CA3AF] py-2 text-center">
                Noch keine Ausgabenkategorien.
              </p>
            )}
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#111827]">{cat.name}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      {TYPE_LABELS[cat.type]}
                      {cat.type === 'once' && cat.once_month && ` · ${cat.once_month.slice(0, 7)}`}
                      {cat.type === 'yearly' && cat.yearly_month && ` · jeden ${MONTH_NAMES[cat.yearly_month - 1]}`}
                      {(cat.type === 'monthly' || cat.type === 'daily') && cat.start_month && ` · ab ${cat.start_month.slice(0, 7)}`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold neg num shrink-0">
                    {cat.default_amount > 0 ? `€ ${fmt(Number(cat.default_amount))}` : '–'}
                  </span>
                  <button onClick={() => openEditCat(cat)} className="btn-ghost text-xs shrink-0">Bearbeiten</button>
                  <button onClick={() => deleteCat(cat.id)} className="btn-danger text-xs shrink-0">Löschen</button>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-[#F3F4F6]">
              <button onClick={openNewCat} className="btn-primary w-full">+ Neue Kategorie</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function CategoryForm({
  form,
  editing,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  form: Partial<ExpenseCategory>
  editing: ExpenseCategory | null
  saving: boolean
  onChange: (f: Partial<ExpenseCategory>) => void
  onSave: () => void
  onCancel: () => void
}) {
  const set = (patch: Partial<ExpenseCategory>) => onChange({ ...form, ...patch })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <button onClick={onCancel} className="btn-ghost text-xs">← Zurück</button>
        <span className="text-sm font-semibold text-[#111827]">
          {editing ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
        </span>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">Name</label>
        <input
          className="field"
          value={form.name ?? ''}
          onChange={e => set({ name: e.target.value })}
          placeholder="z.B. Miete, Lebensmittel, Versicherung…"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-2">Typ</label>
        <div className="grid grid-cols-2 gap-2">
          {(['monthly', 'daily', 'once', 'yearly'] as const).map(t => (
            <button
              key={t}
              onClick={() => set({ type: t })}
              className={`py-2 px-3 text-sm rounded-lg border transition-colors text-left ${
                form.type === t
                  ? 'border-[#1E3A8A] bg-[#EFF6FF] text-[#1E3A8A] font-medium'
                  : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'
              }`}
            >
              <span className="block font-medium">{
                { monthly: 'Monatlich', daily: 'Pro Tag × Tage', once: 'Einmalig', yearly: 'Jährlich' }[t]
              }</span>
              <span className="block text-xs opacity-70">
                {t === 'monthly' && 'Gleicher Betrag jeden Monat'}
                {t === 'daily' && 'Betrag × Tage im Monat'}
                {t === 'once' && 'Einmalig in einem Monat'}
                {t === 'yearly' && 'Einmal pro Jahr'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">
          {form.type === 'daily' ? 'Betrag pro Tag (€)' : 'Betrag (€)'}
        </label>
        <input
          className="field"
          type="number"
          value={form.default_amount ?? ''}
          onChange={e => set({ default_amount: parseFloat(e.target.value) || 0 })}
          min="0"
          step="0.01"
        />
      </div>

      {(form.type === 'monthly' || form.type === 'daily') && (
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">
            Ab welchem Monat? <span className="font-normal text-[#9CA3AF]">(leer = sofort ab Planungsbeginn)</span>
          </label>
          <input
            type="month"
            className="field"
            value={form.start_month?.slice(0, 7) ?? ''}
            onChange={e => set({ start_month: e.target.value ? e.target.value + '-01' : null })}
          />
        </div>
      )}

      {form.type === 'once' && (
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">In welchem Monat?</label>
          <input
            type="month"
            className="field"
            value={form.once_month?.slice(0, 7) ?? ''}
            onChange={e => set({ once_month: e.target.value ? e.target.value + '-01' : null })}
          />
        </div>
      )}

      {form.type === 'yearly' && (
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">In welchem Monat jedes Jahr?</label>
          <select
            className="field"
            value={form.yearly_month ?? ''}
            onChange={e => set({ yearly_month: parseInt(e.target.value) || null })}
          >
            <option value="">Monat wählen…</option>
            {MONTH_NAMES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={onSave} disabled={saving || !form.name} className="btn-primary flex-1">
          {saving ? 'Speichern…' : editing ? 'Änderungen speichern' : 'Erstellen'}
        </button>
        <button onClick={onCancel} className="btn-secondary">Abbruch</button>
      </div>
    </div>
  )
}

function MonthDetail({ month }: { month: CalculatedMonth }) {
  return (
    <div className="space-y-4">
      {month.internship && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          Internship: <strong>{month.internship.name}</strong>
        </div>
      )}
      <div>
        <p className="section-label mb-2">Einnahmen</p>
        <div className="flex justify-between items-center py-2 border-b border-[#F3F4F6]">
          <span className="text-sm text-[#111827]">{month.income_label !== '–' ? month.income_label : 'Einnahmen'}</span>
          <span className={`text-sm font-semibold num ${month.income > 0 ? 'pos' : 'text-[#9CA3AF]'}`}>
            + € {fmt(month.income)}
          </span>
        </div>
      </div>
      {month.expenses.length > 0 && (
        <div>
          <p className="section-label mb-2">Ausgaben</p>
          <div className="space-y-0">
            {month.expenses.filter(e => e.amount > 0).map(exp => (
              <div key={exp.category_id} className="flex justify-between items-center py-2 border-b border-[#F3F4F6]">
                <span className="text-sm text-[#111827]">{exp.name}</span>
                <span className="text-sm num neg">– € {fmt(exp.amount)}</span>
              </div>
            ))}
            {month.expenses.every(e => e.amount === 0) && (
              <p className="text-sm text-[#9CA3AF]">Keine Ausgaben konfiguriert.</p>
            )}
          </div>
        </div>
      )}
      <div className="pt-2 border-t border-[#E5E7EB] space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-[#111827]">Monatsergebnis</span>
          <span className={`text-base font-bold num ${month.result >= 0 ? 'pos' : 'neg'}`}>
            {month.result >= 0 ? '+' : '–'} € {fmt(Math.abs(month.result))}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-[#6B7280]">Kumuliert</span>
          <span className={`text-sm font-semibold num ${month.cumulative >= 0 ? 'pos' : 'neg'}`}>
            € {fmt(month.cumulative)}
          </span>
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
