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

export default function PlanningPage() {
  const [data, setData] = useState<CalcResponse | null>(null)
  const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>([])
  const [loading, setLoading] = useState(true)

  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<IncomeEditMode>('none')
  const [editTypeId, setEditTypeId] = useState<string>('')
  const [editManual, setEditManual] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const editRef = useRef<HTMLDivElement>(null)

  const [detailMonth, setDetailMonth] = useState<CalculatedMonth | null>(null)

  const fetchData = useCallback(async () => {
    const [calcRes, typesRes] = await Promise.all([
      fetch('/api/calculated'),
      fetch('/api/income-types'),
    ])
    const [calc, types] = await Promise.all([calcRes.json(), typesRes.json()])
    setData(calc)
    setIncomeTypes(types)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!editingDate) return
    function handleClick(e: MouseEvent) {
      if (editRef.current && !editRef.current.contains(e.target as Node)) {
        setEditingDate(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [editingDate])

  function openEditor(month: CalculatedMonth) {
    setEditingDate(month.month_date)
    const md = month.month_data
    if (md?.manual_salary != null) {
      setEditMode('manual')
      setEditManual(String(md.manual_salary))
      setEditTypeId('')
    } else if (md?.income_type_id) {
      setEditMode('type')
      setEditTypeId(md.income_type_id)
      setEditManual('')
    } else {
      setEditMode('none')
      setEditTypeId('')
      setEditManual('')
    }
  }

  async function saveIncome(monthDate: string) {
    setSaving(true)
    const body: Record<string, unknown> = { month_date: monthDate }
    if (editMode === 'type') {
      body.income_type_id = editTypeId || null
      body.manual_salary = null
    } else if (editMode === 'manual') {
      body.manual_salary = parseFloat(editManual) || 0
      body.income_type_id = null
    } else {
      body.income_type_id = null
      body.manual_salary = null
    }
    await fetch('/api/month-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setEditingDate(null)
    await fetchData()
    setSaving(false)
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
        {categories.length === 0 && (
          <a href="/setup" className="text-xs text-[#3B82F6] hover:underline">
            Ausgabenkategorien konfigurieren →
          </a>
        )}
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
                  <th key={cat.id} className="t-head px-4 py-3 text-right whitespace-nowrap">
                    {cat.name}
                    <span className="block font-normal normal-case tracking-normal text-[#9CA3AF] text-[11px]">
                      {cat.type === 'daily' ? '/ Tag' : cat.type === 'once' ? 'Einmalig' : cat.type === 'yearly' ? 'Jährlich' : '/ Mo'}
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
                  <tr
                    key={month.month_date}
                    className={`t-row group ${isInternship ? 'bg-amber-50' : ''}`}
                  >
                    {/* Month label */}
                    <td
                      className={`t-cell px-4 py-2.5 font-medium whitespace-nowrap sticky left-0 z-10 ${
                        isLast ? 'border-b-0' : ''
                      } ${isInternship ? 'bg-amber-50' : 'bg-white'}`}
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
                        <div ref={editRef} className="inline-flex flex-col gap-1.5 items-end text-left min-w-[230px]">
                          <select
                            className="field text-xs"
                            value={editMode === 'manual' ? '__manual__' : editMode === 'type' ? editTypeId : ''}
                            onChange={e => {
                              const v = e.target.value
                              if (v === '__manual__') { setEditMode('manual'); setEditTypeId('') }
                              else if (v === '') { setEditMode('none'); setEditTypeId('') }
                              else { setEditMode('type'); setEditTypeId(v) }
                            }}
                          >
                            <option value="">– Keine Einnahmen –</option>
                            {incomeTypes.map(it => (
                              <option key={it.id} value={it.id}>{it.name}</option>
                            ))}
                            <option value="__manual__">Manuell eingeben</option>
                          </select>
                          {editMode === 'manual' && (
                            <input
                              className="field text-xs w-36"
                              type="number"
                              value={editManual}
                              onChange={e => setEditManual(e.target.value)}
                              placeholder="Nettobetrag €"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveIncome(month.month_date)
                                if (e.key === 'Escape') setEditingDate(null)
                              }}
                            />
                          )}
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => saveIncome(month.month_date)}
                              disabled={saving}
                              className="btn-primary text-xs px-3 py-1.5"
                            >
                              {saving ? '…' : 'Speichern'}
                            </button>
                            <button onClick={() => setEditingDate(null)} className="btn-secondary text-xs px-3 py-1.5">
                              Abbruch
                            </button>
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
                      <td
                        key={exp.category_id}
                        className={`t-cell px-4 py-2.5 text-right ${isLast ? 'border-b-0' : ''}`}
                      >
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

                    {/* Details button */}
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
          <span className="text-sm text-[#111827]">
            {month.income_label !== '–' ? month.income_label : 'Einnahmen'}
          </span>
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
              <div
                key={exp.category_id}
                className="flex justify-between items-center py-2 border-b border-[#F3F4F6]"
              >
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
