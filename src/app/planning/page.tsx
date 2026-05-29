'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import type { CalculatedMonth, ExpenseCategory, IncomeType, MonthExpenseOverride } from '@/types'
import { fmt, computeIncomeForType } from '@/lib/calculations'
import Modal from '@/components/Modal'

interface CalcResponse {
  months: CalculatedMonth[]
  expense_categories: ExpenseCategory[]
  net_capital: number
  default_income_type_id: string | null
}

const TYPE_LABELS: Record<ExpenseCategory['type'], string> = {
  monthly: 'Monatlich', daily: 'Pro Tag', once: 'Einmalig', yearly: 'Jährlich',
}
const MONTH_NAMES = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlanningPage() {
  const [calcData, setCalcData] = useState<CalcResponse | null>(null)
  const [netCapital, setNetCapital] = useState(0)
  const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>([])
  const [monthExpOverrides, setMonthExpOverrides] = useState<MonthExpenseOverride[]>([])
  const [defaultIncomeTypeId, setDefaultIncomeTypeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Income cell inline editing
  const [editingIncDate, setEditingIncDate] = useState<string | null>(null)
  const [editIncManual, setEditIncManual] = useState('')
  const [editIncTypeId, setEditIncTypeId] = useState('')
  const [savingInc, setSavingInc] = useState(false)
  const incEditRef = useRef<HTMLDivElement>(null)

  // Expense cell inline editing
  const [editingExp, setEditingExp] = useState<{ date: string; catId: string } | null>(null)
  const [editExpVal, setEditExpVal] = useState('')
  const [savingExp, setSavingExp] = useState(false)
  const expEditRef = useRef<HTMLInputElement>(null)

  // Modal states
  const [detailMonth, setDetailMonth] = useState<CalculatedMonth | null>(null)
  const [incomeModal, setIncomeModal] = useState(false)
  const [editingIT, setEditingIT] = useState<IncomeType | null>(null)
  const [itForm, setItForm] = useState<Partial<IncomeType>>({ type: 'hourly' })
  const [savingIT, setSavingIT] = useState(false)
  const [catModal, setCatModal] = useState(false)
  const [editingCat, setEditingCat] = useState<ExpenseCategory | null>(null)
  const [catForm, setCatForm] = useState<Partial<ExpenseCategory>>({ type: 'monthly' })
  const [savingCat, setSavingCat] = useState(false)

  // Mobile panel
  const [showMobilePanel, setShowMobilePanel] = useState(false)

  const load = useCallback(async () => {
    const [calcRes, capitalRes, typesRes, overridesRes] = await Promise.all([
      fetch('/api/calculated').then(r => r.json()),
      fetch('/api/capital-items').then(r => r.ok ? r.json() : []),
      fetch('/api/income-types').then(r => r.json()),
      fetch('/api/month-expense-overrides').then(r => r.ok ? r.json() : []),
    ])
    setCalcData(calcRes)
    setDefaultIncomeTypeId(calcRes.default_income_type_id ?? null)
    setIncomeTypes(Array.isArray(typesRes) ? typesRes : [])
    setMonthExpOverrides(Array.isArray(overridesRes) ? overridesRes : [])
    // Compute net capital independently from capital items (server-side may return 0 due to RLS)
    const nc = (Array.isArray(capitalRes) ? capitalRes : []).reduce((sum: number, item: { amount: unknown; category: string }) => {
      const amt = Number(item.amount) || 0
      return (item.category === 'Cash' || item.category === 'Receivables') ? sum + amt : sum - amt
    }, 0)
    setNetCapital(nc)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Close income editor on outside click
  useEffect(() => {
    if (!editingIncDate) return
    const h = (e: MouseEvent) => {
      if (incEditRef.current && !incEditRef.current.contains(e.target as Node)) setEditingIncDate(null)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [editingIncDate])

  // ── Data derived from state ──────────────────────────────────────────────────
  const serverNetCapital = calcData?.net_capital ?? 0
  const offset = netCapital - serverNetCapital
  const rawMonths = calcData?.months ?? []
  const months = rawMonths.map(m => ({ ...m, cumulative: m.cumulative + offset }))
  const categories = calcData?.expense_categories ?? []

  // Build override lookup: "YYYY-MM-01:catId" → override
  const overrideMap = new Map<string, MonthExpenseOverride>()
  for (const o of monthExpOverrides) overrideMap.set(`${o.month_date}:${o.expense_category_id}`, o)

  // ── Income editing ───────────────────────────────────────────────────────────
  function openIncEditor(month: CalculatedMonth) {
    setEditingIncDate(month.month_date)
    const md = month.month_data
    if (md?.manual_salary != null) {
      setEditIncManual(String(md.manual_salary)); setEditIncTypeId('')
    } else if (md?.income_type_id) {
      setEditIncTypeId(md.income_type_id); setEditIncManual('')
    } else {
      setEditIncManual(''); setEditIncTypeId('')
    }
  }

  async function saveIncome(monthDate: string) {
    setSavingInc(true)
    const body: Record<string, unknown> = { month_date: monthDate }
    if (editIncTypeId) { body.income_type_id = editIncTypeId; body.manual_salary = null }
    else { body.manual_salary = parseFloat(editIncManual) || null; body.income_type_id = null }
    await fetch('/api/month-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setEditingIncDate(null)
    await load()
    setSavingInc(false)
  }

  // ── Expense editing ──────────────────────────────────────────────────────────
  function openExpEditor(monthDate: string, catId: string, currentDisplayAmount: number) {
    const key = `${monthDate}:${catId}`
    const existing = overrideMap.get(key)
    setEditingExp({ date: monthDate, catId })
    setEditExpVal(existing ? String(existing.amount) : String(currentDisplayAmount || ''))
    setTimeout(() => expEditRef.current?.focus(), 0)
  }

  async function saveExp() {
    if (!editingExp) return
    setSavingExp(true)
    const { date, catId } = editingExp
    const key = `${date}:${catId}`
    const existing = overrideMap.get(key)
    if (editExpVal === '' || editExpVal === '0') {
      if (existing) await fetch(`/api/month-expense-overrides/${existing.id}`, { method: 'DELETE' })
    } else {
      await fetch('/api/month-expense-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month_date: date, expense_category_id: catId, amount: parseFloat(editExpVal) || 0 }),
      })
    }
    setEditingExp(null)
    await load()
    setSavingExp(false)
  }

  // ── Income types CRUD ────────────────────────────────────────────────────────
  function openNewIT() { setEditingIT(null); setItForm({ type: 'hourly', hours_per_week: 0, salary_per_hour: 0, tax_rate: 0, manual_amount: 0 }); setIncomeModal(true) }
  function openEditIT(it: IncomeType) { setEditingIT(it); setItForm({ ...it }); setIncomeModal(true) }

  async function saveIT() {
    setSavingIT(true)
    const url = editingIT ? `/api/income-types/${editingIT.id}` : '/api/income-types'
    await fetch(url, { method: editingIT ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(itForm) })
    setIncomeModal(false)
    await load()
    setSavingIT(false)
  }

  async function deleteIT(id: string) {
    if (!confirm('Einnahmenart löschen?')) return
    await fetch(`/api/income-types/${id}`, { method: 'DELETE' })
    await load()
  }

  async function setDefaultIT(id: string | null) {
    setDefaultIncomeTypeId(id)
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ default_income_type_id: id ?? '' }),
    })
    await load()
  }

  // ── Expense categories CRUD ──────────────────────────────────────────────────
  function openNewCat() { setEditingCat(null); setCatForm({ type: 'monthly', default_amount: 0 }); setCatModal(true) }
  function openEditCat(c: ExpenseCategory) { setEditingCat(c); setCatForm({ ...c }); setCatModal(true) }

  async function saveCat() {
    setSavingCat(true)
    const url = editingCat ? `/api/expense-categories/${editingCat.id}` : '/api/expense-categories'
    await fetch(url, {
      method: editingCat ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: catForm.name, type: catForm.type, default_amount: catForm.default_amount ?? 0,
        once_month: catForm.type === 'once' ? (catForm.once_month ?? null) : null,
        yearly_month: catForm.type === 'yearly' ? (catForm.yearly_month ?? null) : null,
        start_month: (catForm.type === 'monthly' || catForm.type === 'daily') ? (catForm.start_month ?? null) : null,
      }),
    })
    setCatModal(false)
    await load()
    setSavingCat(false)
  }

  async function deleteCat(id: string) {
    if (!confirm('Kategorie löschen? Alle monatlichen Überschreibungen werden auch entfernt.')) return
    await fetch(`/api/expense-categories/${id}`, { method: 'DELETE' })
    await load()
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-[#9CA3AF]">Laden…</div>

  const panelContent = (
    <SidePanel
      incomeTypes={incomeTypes}
      categories={categories}
      defaultIncomeTypeId={defaultIncomeTypeId}
      onSetDefaultIT={setDefaultIT}
      onNewIT={openNewIT} onEditIT={openEditIT} onDeleteIT={deleteIT}
      onNewCat={openNewCat} onEditCat={openEditCat} onDeleteCat={deleteCat}
    />
  )

  return (
    <div className="flex" style={{ height: 'calc(100vh - 52px)' }}>

      {/* ── Left panel (desktop) ───────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-[264px] shrink-0 border-r border-[#E5E7EB] bg-white overflow-y-auto">
        {panelContent}
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F1F5F9]">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-[#E5E7EB]">
          <button
            onClick={() => setShowMobilePanel(true)}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Konfiguration
          </button>
          <span className="text-sm font-semibold text-[#111827]">Planung</span>
        </div>

        {/* ── Desktop table ──────────────────────────────────────────────── */}
        {months.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-sm text-[#6B7280]">
            <p>Kein Planungszeitraum – bitte in den Einstellungen konfigurieren.</p>
          </div>
        ) : (
          <>
            {/* Table (desktop) */}
            <div className="hidden md:block flex-1 overflow-auto">
              <PlanningTable
                months={months}
                categories={categories}
                incomeTypes={incomeTypes}
                overrideMap={overrideMap}
                editingIncDate={editingIncDate}
                editIncManual={editIncManual}
                editIncTypeId={editIncTypeId}
                savingInc={savingInc}
                incEditRef={incEditRef}
                onOpenIncEditor={openIncEditor}
                onSetEditIncManual={setEditIncManual}
                onSetEditIncTypeId={setEditIncTypeId}
                onSaveIncome={saveIncome}
                onCloseIncEditor={() => setEditingIncDate(null)}
                editingExp={editingExp}
                editExpVal={editExpVal}
                savingExp={savingExp}
                expEditRef={expEditRef}
                onOpenExpEditor={openExpEditor}
                onSetEditExpVal={setEditExpVal}
                onSaveExp={saveExp}
                onCloseExpEditor={() => setEditingExp(null)}
                onOpenDetail={setDetailMonth}
              />
            </div>

            {/* Cards (mobile) */}
            <div className="md:hidden flex-1 overflow-y-auto p-3 space-y-3">
              {months.map(m => (
                <MonthCard
                  key={m.month_date}
                  month={m}
                  categories={categories}
                  overrideMap={overrideMap}
                  onOpenDetail={setDetailMonth}
                  onOpenIncEditor={openIncEditor}
                  onOpenExpEditor={openExpEditor}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Mobile side panel overlay ────────────────────────────────────── */}
      {showMobilePanel && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobilePanel(false)} />
          <div className="relative w-[280px] bg-white h-full overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
              <p className="text-sm font-semibold">Konfiguration</p>
              <button onClick={() => setShowMobilePanel(false)} className="btn-ghost text-xs">✕</button>
            </div>
            {panelContent}
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <Modal open={!!detailMonth} onClose={() => setDetailMonth(null)} title={detailMonth?.label ?? ''}>
        {detailMonth && <MonthDetail month={detailMonth} />}
      </Modal>

      <Modal open={incomeModal} onClose={() => setIncomeModal(false)} title={editingIT ? 'Einnahmenart bearbeiten' : 'Neue Einnahmenart'}>
        <IncomeTypeForm
          form={itForm}
          saving={savingIT}
          onChange={setItForm}
          onSave={saveIT}
          onCancel={() => setIncomeModal(false)}
        />
      </Modal>

      <Modal open={catModal} onClose={() => setCatModal(false)} title={editingCat ? 'Kategorie bearbeiten' : 'Neue Ausgabenkategorie'}>
        <CategoryForm
          form={catForm}
          saving={savingCat}
          onChange={setCatForm}
          onSave={saveCat}
          onCancel={() => setCatModal(false)}
        />
      </Modal>
    </div>
  )
}

// ─── Side panel ───────────────────────────────────────────────────────────────

function SidePanel({
  incomeTypes, categories, defaultIncomeTypeId,
  onSetDefaultIT, onNewIT, onEditIT, onDeleteIT,
  onNewCat, onEditCat, onDeleteCat,
}: {
  incomeTypes: IncomeType[]
  categories: ExpenseCategory[]
  defaultIncomeTypeId: string | null
  onSetDefaultIT: (id: string | null) => void
  onNewIT: () => void
  onEditIT: (it: IncomeType) => void
  onDeleteIT: (id: string) => void
  onNewCat: () => void
  onEditCat: (c: ExpenseCategory) => void
  onDeleteCat: (id: string) => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Income types */}
      <div className="p-3 border-b border-[#E5E7EB]">
        <div className="flex items-center justify-between mb-2">
          <p className="section-label">Einnahmenarten</p>
          <button onClick={onNewIT} className="text-[#1E3A8A] hover:bg-[#EFF6FF] rounded-md px-1.5 py-0.5 text-lg leading-none transition-colors" title="Neue Einnahmenart">+</button>
        </div>
        {incomeTypes.length > 0 && (
          <div className="mb-2">
            <label className="block text-[10px] text-[#9CA3AF] mb-1">Standard</label>
            <select
              className="field text-xs w-full"
              value={defaultIncomeTypeId ?? ''}
              onChange={e => onSetDefaultIT(e.target.value || null)}
            >
              <option value="">– Keine –</option>
              {incomeTypes.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
            </select>
          </div>
        )}
        {incomeTypes.length === 0 && (
          <p className="text-xs text-[#9CA3AF] py-1">Noch keine Einnahmenarten.</p>
        )}
        <div className="space-y-1">
          {incomeTypes.map(it => (
            <div key={it.id} className="flex items-center gap-1 group py-1 rounded-md px-1 hover:bg-[#F9FAFB] transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#111827] truncate">{it.name}</p>
                <p className="text-[11px] text-[#9CA3AF]">€ {fmt(computeIncomeForType(it))} / Mo</p>
              </div>
              <button onClick={() => onEditIT(it)} className="opacity-0 group-hover:opacity-100 text-[#6B7280] hover:text-[#111827] p-0.5 rounded transition-opacity" title="Bearbeiten">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button onClick={() => onDeleteIT(it.id)} className="opacity-0 group-hover:opacity-100 text-[#9CA3AF] hover:text-[#DC2626] p-0.5 rounded transition-opacity" title="Löschen">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Expense categories */}
      <div className="p-3 flex-1">
        <div className="flex items-center justify-between mb-2">
          <p className="section-label">Ausgabenkategorien</p>
          <button onClick={onNewCat} className="text-[#1E3A8A] hover:bg-[#EFF6FF] rounded-md px-1.5 py-0.5 text-lg leading-none transition-colors" title="Neue Kategorie">+</button>
        </div>
        {categories.length === 0 && (
          <p className="text-xs text-[#9CA3AF] py-1">Noch keine Kategorien.</p>
        )}
        <div className="space-y-1">
          {categories.map(c => (
            <div key={c.id} className="flex items-center gap-1 group py-1 rounded-md px-1 hover:bg-[#F9FAFB] transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#111827] truncate">{c.name}</p>
                <p className="text-[11px] text-[#9CA3AF]">
                  {TYPE_LABELS[c.type]}
                  {Number(c.default_amount) > 0 && ` · € ${fmt(Number(c.default_amount))}`}
                  {c.start_month && ` · ab ${c.start_month.slice(0, 7)}`}
                </p>
              </div>
              <button onClick={() => onEditCat(c)} className="opacity-0 group-hover:opacity-100 text-[#6B7280] hover:text-[#111827] p-0.5 rounded transition-opacity" title="Bearbeiten">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button onClick={() => onDeleteCat(c.id)} className="opacity-0 group-hover:opacity-100 text-[#9CA3AF] hover:text-[#DC2626] p-0.5 rounded transition-opacity" title="Löschen">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Planning table (desktop) ─────────────────────────────────────────────────

function PlanningTable({
  months, categories, incomeTypes, overrideMap,
  editingIncDate, editIncManual, editIncTypeId, savingInc, incEditRef,
  onOpenIncEditor, onSetEditIncManual, onSetEditIncTypeId, onSaveIncome, onCloseIncEditor,
  editingExp, editExpVal, savingExp, expEditRef,
  onOpenExpEditor, onSetEditExpVal, onSaveExp, onCloseExpEditor,
  onOpenDetail,
}: {
  months: CalculatedMonth[]
  categories: ExpenseCategory[]
  incomeTypes: IncomeType[]
  overrideMap: Map<string, MonthExpenseOverride>
  editingIncDate: string | null
  editIncManual: string
  editIncTypeId: string
  savingInc: boolean
  incEditRef: React.RefObject<HTMLDivElement>
  onOpenIncEditor: (m: CalculatedMonth) => void
  onSetEditIncManual: (v: string) => void
  onSetEditIncTypeId: (v: string) => void
  onSaveIncome: (date: string) => void
  onCloseIncEditor: () => void
  editingExp: { date: string; catId: string } | null
  editExpVal: string
  savingExp: boolean
  expEditRef: React.RefObject<HTMLInputElement>
  onOpenExpEditor: (date: string, catId: string, amount: number) => void
  onSetEditExpVal: (v: string) => void
  onSaveExp: () => void
  onCloseExpEditor: () => void
  onOpenDetail: (m: CalculatedMonth) => void
}) {
  // Totals
  const totIncome = months.reduce((s, m) => s + m.income, 0)
  const totExpenses = categories.map(cat => ({
    catId: cat.id,
    total: months.reduce((s, m) => s + (m.expenses.find(e => e.category_id === cat.id)?.amount ?? 0), 0),
  }))
  const totResult = months.reduce((s, m) => s + m.result, 0)
  const finalCumulative = months[months.length - 1]?.cumulative ?? 0

  const minWidth = `${200 + categories.length * 110 + 240}px`

  return (
    <table className="w-full text-sm border-separate border-spacing-0 bg-white" style={{ minWidth }}>
      <thead className="sticky top-0 z-20">
        <tr>
          <th className="t-head px-3 py-2.5 text-left sticky left-0 z-30 bg-[#F9FAFB]" style={{ minWidth: 110, borderRight: '1px solid #E5E7EB' }}>Monat</th>
          <th className="t-head px-3 py-2.5 text-right" style={{ minWidth: 120 }}>Einnahmen</th>
          {categories.map(cat => (
            <th key={cat.id} className="t-head px-3 py-2.5 text-right" style={{ minWidth: 110 }}>
              <span className="truncate block max-w-[100px] ml-auto">{cat.name}</span>
              <span className="block font-normal normal-case tracking-normal text-[#9CA3AF] text-[10px]">
                {cat.type === 'daily' ? '/ Tag' : cat.type === 'once' ? 'Einmalig' : cat.type === 'yearly' ? 'Jährlich' : '/ Mo'}
              </span>
            </th>
          ))}
          <th className="t-head px-3 py-2.5 text-right" style={{ minWidth: 100 }}>Ergebnis</th>
          <th className="t-head px-3 py-2.5 text-right" style={{ minWidth: 110 }}>Kumuliert</th>
          <th className="t-head px-2 py-2.5 w-16"></th>
        </tr>
      </thead>
      <tbody>
        {months.map((month, idx) => {
          const isInternship = !!month.internship
          const isLast = idx === months.length - 1
          const isEditing = editingIncDate === month.month_date
          return (
            <tr key={month.month_date} className={`t-row group ${isInternship ? 'bg-amber-50' : ''}`}>
              {/* Month */}
              <td
                className={`t-cell px-3 py-2 font-medium whitespace-nowrap sticky left-0 z-10 ${isLast ? 'border-b-0' : ''} ${isInternship ? 'bg-amber-50' : 'bg-white'}`}
                style={{ borderRight: '1px solid #E5E7EB' }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">{month.label}</span>
                  {isInternship && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 rounded px-1 py-0.5">{month.internship!.name}</span>
                  )}
                </div>
              </td>

              {/* Income */}
              <td className={`t-cell px-1.5 py-1 text-right ${isLast ? 'border-b-0' : ''}`}>
                {isEditing ? (
                  <div ref={incEditRef} className="flex flex-col gap-1 items-end p-1 min-w-[180px]">
                    <input
                      className="field text-xs w-full"
                      type="number"
                      value={editIncManual}
                      onChange={e => { onSetEditIncManual(e.target.value); onSetEditIncTypeId('') }}
                      placeholder="Betrag €"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') onSaveIncome(month.month_date); if (e.key === 'Escape') onCloseIncEditor() }}
                    />
                    {incomeTypes.length > 0 && (
                      <select
                        className="field text-xs w-full"
                        value={editIncTypeId}
                        onChange={e => { onSetEditIncTypeId(e.target.value); onSetEditIncManual('') }}
                      >
                        <option value="">– Einnahmenart –</option>
                        {incomeTypes.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                      </select>
                    )}
                    <div className="flex gap-1">
                      <button onClick={() => onSaveIncome(month.month_date)} disabled={savingInc} className="btn-primary text-xs px-2.5 py-1">{savingInc ? '…' : '✓'}</button>
                      <button onClick={onCloseIncEditor} className="btn-secondary text-xs px-2.5 py-1">✕</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => onOpenIncEditor(month)}
                    className="editable rounded px-2 py-1.5 text-right w-full"
                    title="Klicken zum Bearbeiten"
                  >
                    <span className={`num text-xs font-medium ${month.income > 0 ? 'pos' : 'text-[#9CA3AF]'}`}>
                      {month.income > 0 ? `€ ${fmt(month.income)}` : '–'}
                    </span>
                    {month.income_label !== '–' && (
                      <span className="block text-[10px] text-[#9CA3AF] truncate max-w-[100px] ml-auto">{month.income_label}</span>
                    )}
                  </button>
                )}
              </td>

              {/* Expense cells */}
              {month.expenses.map(exp => {
                const isEditingThis = editingExp?.date === month.month_date && editingExp?.catId === exp.category_id
                const key = `${month.month_date}:${exp.category_id}`
                const isOverridden = overrideMap.has(key)
                return (
                  <td key={exp.category_id} className={`t-cell px-1 py-1 text-right ${isLast ? 'border-b-0' : ''}`}>
                    {isEditingThis ? (
                      <input
                        ref={expEditRef}
                        className="field text-xs w-24 text-right"
                        type="number"
                        value={editExpVal}
                        onChange={e => onSetEditExpVal(e.target.value)}
                        onBlur={onSaveExp}
                        onKeyDown={e => { if (e.key === 'Enter') onSaveExp(); if (e.key === 'Escape') onCloseExpEditor() }}
                        min="0" step="0.01"
                        disabled={savingExp}
                      />
                    ) : (
                      <button
                        onClick={() => onOpenExpEditor(month.month_date, exp.category_id, exp.amount)}
                        className={`editable rounded px-2 py-1.5 text-right w-full ${isOverridden ? 'ring-1 ring-[#3B82F6]/30 bg-[#EFF6FF]/50' : ''}`}
                        title={isOverridden ? 'Überschrieben – klicken zum Bearbeiten' : 'Klicken zum Bearbeiten'}
                      >
                        <span className={`num text-xs ${exp.amount > 0 ? 'neg' : 'text-[#D1D5DB]'}`}>
                          {exp.amount > 0 ? `€ ${fmt(exp.amount)}` : '–'}
                        </span>
                        {isOverridden && <span className="block text-[9px] text-[#3B82F6]">↗</span>}
                      </button>
                    )}
                  </td>
                )
              })}

              {/* Result */}
              <td className={`t-cell px-3 py-2 text-right font-semibold num text-xs ${isLast ? 'border-b-0' : ''} ${month.result >= 0 ? 'pos' : 'neg'}`}>
                {month.result >= 0 ? '+' : '–'}€ {fmt(Math.abs(month.result))}
              </td>

              {/* Cumulative */}
              <td className={`t-cell px-3 py-2 text-right font-bold num text-xs ${isLast ? 'border-b-0' : ''} ${month.cumulative >= 0 ? 'pos' : 'neg'}`}>
                € {fmt(month.cumulative)}
              </td>

              {/* Detail */}
              <td className={`t-cell px-1.5 py-2 ${isLast ? 'border-b-0' : ''}`}>
                <button
                  onClick={() => onOpenDetail(month)}
                  className="text-[10px] text-[#9CA3AF] hover:text-[#1E3A8A] px-1.5 py-1 rounded hover:bg-[#EFF6FF] transition-colors"
                >
                  Details
                </button>
              </td>
            </tr>
          )
        })}

        {/* ── Totals row ────────────────────────────────────────────────── */}
        <tr className="bg-[#F9FAFB]">
          <td className="px-3 py-2.5 text-xs font-semibold text-[#6B7280] uppercase tracking-wider sticky left-0 bg-[#F9FAFB] border-t border-[#E5E7EB]" style={{ borderRight: '1px solid #E5E7EB' }}>
            Gesamt
          </td>
          <td className="px-3 py-2.5 text-right border-t border-[#E5E7EB]">
            <span className={`num text-xs font-semibold ${totIncome > 0 ? 'pos' : 'text-[#9CA3AF]'}`}>
              {totIncome > 0 ? `€ ${fmt(totIncome)}` : '–'}
            </span>
          </td>
          {totExpenses.map(({ catId, total }) => (
            <td key={catId} className="px-3 py-2.5 text-right border-t border-[#E5E7EB]">
              <span className={`num text-xs font-semibold ${total > 0 ? 'neg' : 'text-[#D1D5DB]'}`}>
                {total > 0 ? `€ ${fmt(total)}` : '–'}
              </span>
            </td>
          ))}
          <td className={`px-3 py-2.5 text-right font-bold num text-xs border-t border-[#E5E7EB] ${totResult >= 0 ? 'pos' : 'neg'}`}>
            {totResult >= 0 ? '+' : '–'}€ {fmt(Math.abs(totResult))}
          </td>
          <td className={`px-3 py-2.5 text-right font-bold num text-xs border-t border-[#E5E7EB] ${finalCumulative >= 0 ? 'pos' : 'neg'}`}>
            € {fmt(finalCumulative)}
          </td>
          <td className="border-t border-[#E5E7EB]"></td>
        </tr>
      </tbody>
    </table>
  )
}

// ─── Mobile month card ────────────────────────────────────────────────────────

function MonthCard({
  month, categories, overrideMap, onOpenDetail, onOpenIncEditor, onOpenExpEditor,
}: {
  month: CalculatedMonth
  categories: ExpenseCategory[]
  overrideMap: Map<string, MonthExpenseOverride>
  onOpenDetail: (m: CalculatedMonth) => void
  onOpenIncEditor: (m: CalculatedMonth) => void
  onOpenExpEditor: (date: string, catId: string, amount: number) => void
}) {
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${month.internship ? 'bg-amber-50' : 'bg-[#F9FAFB]'}`}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#111827]">{month.label}</span>
          {month.internship && (
            <span className="text-xs bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">{month.internship.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold num ${month.result >= 0 ? 'pos' : 'neg'}`}>
            {month.result >= 0 ? '+' : '–'}€ {fmt(Math.abs(month.result))}
          </span>
          <button
            onClick={() => onOpenDetail(month)}
            className="text-xs text-[#9CA3AF] hover:text-[#1E3A8A] px-2 py-1 rounded hover:bg-[#EFF6FF] transition-colors"
          >
            Details
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        {/* Income row */}
        <button
          onClick={() => onOpenIncEditor(month)}
          className="w-full flex items-center justify-between editable rounded-lg px-2 py-1.5"
        >
          <span className="text-xs text-[#6B7280]">Einnahmen</span>
          <span className={`text-sm font-semibold num ${month.income > 0 ? 'pos' : 'text-[#9CA3AF]'}`}>
            {month.income > 0 ? `€ ${fmt(month.income)}` : '–'}
          </span>
        </button>

        {/* Expense rows */}
        {month.expenses.map(exp => {
          const key = `${month.month_date}:${exp.category_id}`
          const isOverridden = overrideMap.has(key)
          return (
            <button
              key={exp.category_id}
              onClick={() => onOpenExpEditor(month.month_date, exp.category_id, exp.amount)}
              className={`w-full flex items-center justify-between editable rounded-lg px-2 py-1.5 ${isOverridden ? 'ring-1 ring-[#3B82F6]/30' : ''}`}
            >
              <span className="text-xs text-[#6B7280] truncate mr-2">{exp.name}</span>
              <span className={`text-sm font-medium num ${exp.amount > 0 ? 'neg' : 'text-[#D1D5DB]'} shrink-0`}>
                {exp.amount > 0 ? `– € ${fmt(exp.amount)}` : '–'}
              </span>
            </button>
          )
        })}
      </div>

      {/* Footer: cumulative */}
      <div className="px-4 py-2 border-t border-[#F3F4F6] flex items-center justify-between">
        <span className="text-xs text-[#9CA3AF]">Kumuliert</span>
        <span className={`text-sm font-bold num ${month.cumulative >= 0 ? 'pos' : 'neg'}`}>
          € {fmt(month.cumulative)}
        </span>
      </div>
    </div>
  )
}

// ─── Income type form ─────────────────────────────────────────────────────────

function IncomeTypeForm({ form, saving, onChange, onSave, onCancel }: {
  form: Partial<IncomeType>
  saving: boolean
  onChange: (f: Partial<IncomeType>) => void
  onSave: () => void
  onCancel: () => void
}) {
  const set = (patch: Partial<IncomeType>) => onChange({ ...form, ...patch })
  const preview = form.type === 'manual'
    ? Number(form.manual_amount) || 0
    : (Number(form.hours_per_week) || 0) * (Number(form.salary_per_hour) || 0) * (1 - (Number(form.tax_rate) || 0)) * (52 / 12)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">Name</label>
        <input className="field" value={form.name ?? ''} onChange={e => set({ name: e.target.value })} placeholder="z.B. Studentenjob" autoFocus />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">Typ</label>
        <div className="flex gap-2">
          {(['hourly', 'manual'] as const).map(t => (
            <button key={t} onClick={() => set({ type: t })}
              className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${form.type === t ? 'border-[#1E3A8A] bg-[#EFF6FF] text-[#1E3A8A] font-medium' : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'}`}
            >
              {t === 'hourly' ? 'Stundenbasiert' : 'Fester Betrag'}
            </button>
          ))}
        </div>
      </div>
      {form.type === 'hourly' ? (
        <div className="grid grid-cols-3 gap-3">
          <div><label className="block text-xs font-medium text-[#6B7280] mb-1">Std / Wo</label>
            <input className="field" type="number" value={form.hours_per_week ?? ''} onChange={e => set({ hours_per_week: parseFloat(e.target.value) || 0 })} min="0" step="0.5" /></div>
          <div><label className="block text-xs font-medium text-[#6B7280] mb-1">€ / Std</label>
            <input className="field" type="number" value={form.salary_per_hour ?? ''} onChange={e => set({ salary_per_hour: parseFloat(e.target.value) || 0 })} min="0" step="0.01" /></div>
          <div><label className="block text-xs font-medium text-[#6B7280] mb-1">Steuer %</label>
            <input className="field" type="number" value={form.tax_rate != null ? Math.round(Number(form.tax_rate) * 100) : ''} onChange={e => set({ tax_rate: (parseFloat(e.target.value) || 0) / 100 })} min="0" max="100" /></div>
        </div>
      ) : (
        <div><label className="block text-xs font-medium text-[#6B7280] mb-1">Nettobetrag / Monat (€)</label>
          <input className="field" type="number" value={form.manual_amount ?? ''} onChange={e => set({ manual_amount: parseFloat(e.target.value) || 0 })} min="0" step="0.01" /></div>
      )}
      <div className="rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] px-4 py-2.5 flex justify-between items-center">
        <span className="text-xs text-[#15803D]">Netto / Monat</span>
        <span className="text-sm font-bold pos num">€ {fmt(preview)}</span>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} disabled={saving || !form.name} className="btn-primary flex-1">{saving ? 'Speichern…' : 'Speichern'}</button>
        <button onClick={onCancel} className="btn-secondary">Abbruch</button>
      </div>
    </div>
  )
}

// ─── Category form ────────────────────────────────────────────────────────────

function CategoryForm({ form, saving, onChange, onSave, onCancel }: {
  form: Partial<ExpenseCategory>
  saving: boolean
  onChange: (f: Partial<ExpenseCategory>) => void
  onSave: () => void
  onCancel: () => void
}) {
  const set = (patch: Partial<ExpenseCategory>) => onChange({ ...form, ...patch })
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">Name</label>
        <input className="field" value={form.name ?? ''} onChange={e => set({ name: e.target.value })} placeholder="z.B. Miete, Lebensmittel…" autoFocus />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-2">Typ</label>
        <div className="grid grid-cols-2 gap-2">
          {(['monthly', 'daily', 'once', 'yearly'] as const).map(t => (
            <button key={t} onClick={() => set({ type: t })}
              className={`py-2 px-3 text-sm rounded-lg border transition-colors text-left ${form.type === t ? 'border-[#1E3A8A] bg-[#EFF6FF] text-[#1E3A8A] font-medium' : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'}`}
            >
              <span className="block font-medium text-xs">{{ monthly: 'Monatlich', daily: 'Pro Tag', once: 'Einmalig', yearly: 'Jährlich' }[t]}</span>
              <span className="block text-[10px] opacity-60 mt-0.5">{{ monthly: 'Jeden Monat', daily: 'Betrag × Tage', once: 'Einmal', yearly: '1× pro Jahr' }[t]}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1">{form.type === 'daily' ? 'Betrag pro Tag (€)' : 'Standardbetrag (€)'}</label>
        <input className="field" type="number" value={form.default_amount ?? ''} onChange={e => set({ default_amount: parseFloat(e.target.value) || 0 })} min="0" step="0.01" />
      </div>
      {(form.type === 'monthly' || form.type === 'daily') && (
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">Ab welchem Monat? <span className="font-normal text-[#9CA3AF]">(leer = sofort)</span></label>
          <input type="month" className="field" value={form.start_month?.slice(0, 7) ?? ''} onChange={e => set({ start_month: e.target.value ? e.target.value + '-01' : null })} />
        </div>
      )}
      {form.type === 'once' && (
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">In welchem Monat?</label>
          <input type="month" className="field" value={form.once_month?.slice(0, 7) ?? ''} onChange={e => set({ once_month: e.target.value ? e.target.value + '-01' : null })} />
        </div>
      )}
      {form.type === 'yearly' && (
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">In welchem Monat jedes Jahr?</label>
          <select className="field" value={form.yearly_month ?? ''} onChange={e => set({ yearly_month: parseInt(e.target.value) || null })}>
            <option value="">Monat wählen…</option>
            {MONTH_NAMES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} disabled={saving || !form.name} className="btn-primary flex-1">{saving ? 'Speichern…' : 'Speichern'}</button>
        <button onClick={onCancel} className="btn-secondary">Abbruch</button>
      </div>
    </div>
  )
}

// ─── Month detail modal ───────────────────────────────────────────────────────

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
          <span className="text-sm">{month.income_label !== '–' ? month.income_label : 'Einnahmen'}</span>
          <span className={`text-sm font-semibold num ${month.income > 0 ? 'pos' : 'text-[#9CA3AF]'}`}>+ € {fmt(month.income)}</span>
        </div>
      </div>
      {month.expenses.length > 0 && (
        <div>
          <p className="section-label mb-2">Ausgaben</p>
          <div className="space-y-0">
            {month.expenses.filter(e => e.amount > 0).map(exp => (
              <div key={exp.category_id} className="flex justify-between items-center py-2 border-b border-[#F3F4F6]">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{exp.name}</span>
                  {exp.is_override && <span className="text-[10px] text-[#3B82F6] bg-[#EFF6FF] rounded px-1">↗</span>}
                </div>
                <span className="text-sm num neg">– € {fmt(exp.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="pt-2 border-t border-[#E5E7EB] space-y-2">
        <div className="flex justify-between">
          <span className="text-sm font-semibold">Monatsergebnis</span>
          <span className={`text-base font-bold num ${month.result >= 0 ? 'pos' : 'neg'}`}>{month.result >= 0 ? '+' : '–'} € {fmt(Math.abs(month.result))}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-[#6B7280]">Kumuliert</span>
          <span className={`text-sm font-semibold num ${month.cumulative >= 0 ? 'pos' : 'neg'}`}>€ {fmt(month.cumulative)}</span>
        </div>
      </div>
    </div>
  )
}
