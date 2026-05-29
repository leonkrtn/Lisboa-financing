'use client'
import { useCallback, useEffect, useState } from 'react'
import type { CalculatedMonth, IncomeType } from '@/types'
import { fmt } from '@/lib/calculations'

type EditState = { monthDate: string; field: string; value: string } | null

export default function MonthsPage() {
  const [months, setMonths] = useState<CalculatedMonth[]>([])
  const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<EditState>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [mRes, itRes] = await Promise.all([
      fetch('/api/months/calculated'),
      fetch('/api/income-types'),
    ])
    setMonths(await mRes.json())
    setIncomeTypes(await itRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function save(month: CalculatedMonth, field: string, value: unknown) {
    setSaving(true)
    if (month.month_id) {
      await fetch(`/api/months/${month.month_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
    } else {
      await fetch('/api/months', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month_date: month.month_date, [field]: value }),
      })
    }
    await load()
    setSaving(false)
  }

  function startEdit(month: CalculatedMonth, field: string, current: string) {
    setEdit({ monthDate: month.month_date, field, value: current })
  }

  function commit(month: CalculatedMonth) {
    if (!edit) return
    const e = edit
    setEdit(null)
    if (e.field === 'manual_salary') {
      const value = e.value.trim() === '' ? null : parseFloat(e.value)
      save(month, e.field, value)
    } else {
      save(month, e.field, parseFloat(e.value) || 0)
    }
  }

  function isEd(m: CalculatedMonth, field: string) {
    return edit?.monthDate === m.month_date && edit.field === field
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-sm text-[#9CA3AF]">Loading…</div>
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 48px)' }}>
      {/* Sub-header */}
      <div className="shrink-0 px-4 py-2 border-b border-[#E5E7EB] bg-white flex items-center justify-between">
        <h1 className="text-sm font-semibold">Monthly Planner</h1>
        <span className="text-xs text-[#9CA3AF]">
          {saving ? 'Saving…' : 'Click a cell to edit · Salary: empty = clear override'}
        </span>
      </div>

      {/* Scrollable table */}
      <div className="flex-1 overflow-auto">
        <table className="text-sm border-separate border-spacing-0" style={{ minWidth: 1180 }}>
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="t-head px-3 py-2 text-left sticky left-0 z-30 bg-[#F9FAFB]">Month</th>
              <th className="t-head px-3 py-2 text-left">Type</th>
              <th className="t-head px-3 py-2 text-right">Salary</th>
              <th className="t-head px-3 py-2 text-right">Support</th>
              <th className="t-head px-3 py-2 text-right">Rent</th>
              <th className="t-head px-3 py-2 text-right">Food</th>
              <th className="t-head px-3 py-2 text-right">Fun</th>
              <th className="t-head px-3 py-2 text-right">Other</th>
              <th className="t-head px-3 py-2 text-right">Ins</th>
              <th className="t-head px-3 py-2 text-center">✈</th>
              <th className="t-head px-3 py-2 text-right">Tuition</th>
              <th className="t-head px-3 py-2 text-right">Annual</th>
              <th className="t-head px-3 py-2 text-right">Adj</th>
              <th className="t-head px-3 py-2 text-right">Result</th>
              <th className="t-head px-3 py-2 text-right">Savings</th>
            </tr>
          </thead>
          <tbody>
            {months.map(m => {
              const isIntern = !!m.internship
              const stickyBg = isIntern ? '#FFFBEB' : '#FFFFFF'

              return (
                <tr key={m.month_date} className={`t-row${isIntern ? ' bg-amber-50' : ''}`}>
                  {/* Month — sticky left */}
                  <td
                    className="t-cell px-3 py-1.5 font-medium whitespace-nowrap sticky left-0 z-10"
                    style={{ background: stickyBg }}
                  >
                    {m.label}
                  </td>

                  {/* Type */}
                  <td className="t-cell px-2 py-1">
                    {isIntern ? (
                      <span className="text-xs bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 whitespace-nowrap">
                        {m.internship!.name}
                      </span>
                    ) : (
                      <select
                        value={m.income_type_id ?? ''}
                        onChange={e => save(m, 'income_type_id', e.target.value || null)}
                        className="field py-0.5 text-xs"
                        style={{ minWidth: 110 }}
                      >
                        <option value="">—</option>
                        {incomeTypes.map(it => (
                          <option key={it.id} value={it.id}>{it.name}</option>
                        ))}
                      </select>
                    )}
                  </td>

                  {/* Salary — manual override editable */}
                  {isEd(m, 'manual_salary') ? (
                    <td className="t-cell px-0 py-0">
                      <input
                        type="number"
                        autoFocus
                        placeholder="auto"
                        value={edit!.value}
                        onChange={e => setEdit(prev => prev ? { ...prev, value: e.target.value } : prev)}
                        onBlur={() => commit(m)}
                        onKeyDown={e => { if (e.key === 'Enter') commit(m); if (e.key === 'Escape') setEdit(null) }}
                        className="editing w-full px-3 py-1.5 text-sm text-right num"
                        style={{ minWidth: 80 }}
                      />
                    </td>
                  ) : (
                    <td
                      className={`t-cell px-3 py-1.5 num text-right editable ${m.salary > 0 ? 'pos' : ''} ${m.manual_salary != null ? 'underline decoration-dotted underline-offset-2' : ''}`}
                      title={m.manual_salary != null ? 'Manual — click to change, clear to reset' : 'Click to override salary'}
                      onClick={() => startEdit(m, 'manual_salary', m.manual_salary != null ? String(m.manual_salary) : '')}
                    >
                      {fmt(m.salary)}
                      {m.manual_salary != null && <span className="ml-1 text-[10px] text-[#9CA3AF]">M</span>}
                    </td>
                  )}

                  {/* Support */}
                  <td className={`t-cell px-3 py-1.5 num text-right ${m.support > 0 ? 'pos' : 'text-[#9CA3AF]'}`}>
                    {fmt(m.support)}
                  </td>

                  {/* Rent */}
                  <td className="t-cell px-3 py-1.5 num text-right neg">{fmt(m.rent)}</td>

                  {/* Food */}
                  <td className="t-cell px-3 py-1.5 num text-right neg">{fmt(m.food)}</td>

                  {/* Fun */}
                  <td className="t-cell px-3 py-1.5 num text-right neg">{fmt(m.fun)}</td>

                  {/* Other */}
                  <td className="t-cell px-3 py-1.5 num text-right neg">{fmt(m.other)}</td>

                  {/* Insurance */}
                  <td className="t-cell px-3 py-1.5 num text-right neg">{fmt(m.insurance)}</td>

                  {/* Flight toggle */}
                  <td className="t-cell px-3 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={m.has_flight}
                      onChange={e => save(m, 'has_flight', e.target.checked)}
                      className="w-4 h-4 accent-[#1E3A8A] cursor-pointer"
                    />
                  </td>

                  {/* Tuition — editable */}
                  {isEd(m, 'tuition_fee') ? (
                    <td className="t-cell px-0 py-0">
                      <input
                        type="number"
                        autoFocus
                        value={edit!.value}
                        onChange={e => setEdit(prev => prev ? { ...prev, value: e.target.value } : prev)}
                        onBlur={() => commit(m)}
                        onKeyDown={e => { if (e.key === 'Enter') commit(m); if (e.key === 'Escape') setEdit(null) }}
                        className="editing w-full px-3 py-1.5 text-sm text-right num"
                        style={{ minWidth: 80 }}
                      />
                    </td>
                  ) : (
                    <td
                      className="t-cell px-3 py-1.5 num text-right editable neg"
                      onClick={() => startEdit(m, 'tuition_fee', String(m.tuition_fee || 0))}
                    >
                      {fmt(m.tuition_fee)}
                    </td>
                  )}

                  {/* Annual — editable */}
                  {isEd(m, 'annual_fee') ? (
                    <td className="t-cell px-0 py-0">
                      <input
                        type="number"
                        autoFocus
                        value={edit!.value}
                        onChange={e => setEdit(prev => prev ? { ...prev, value: e.target.value } : prev)}
                        onBlur={() => commit(m)}
                        onKeyDown={e => { if (e.key === 'Enter') commit(m); if (e.key === 'Escape') setEdit(null) }}
                        className="editing w-full px-3 py-1.5 text-sm text-right num"
                        style={{ minWidth: 80 }}
                      />
                    </td>
                  ) : (
                    <td
                      className="t-cell px-3 py-1.5 num text-right editable neg"
                      onClick={() => startEdit(m, 'annual_fee', String(m.annual_fee || 0))}
                    >
                      {fmt(m.annual_fee)}
                    </td>
                  )}

                  {/* Adjustment — editable */}
                  {isEd(m, 'adjustment') ? (
                    <td className="t-cell px-0 py-0">
                      <input
                        type="number"
                        autoFocus
                        value={edit!.value}
                        onChange={e => setEdit(prev => prev ? { ...prev, value: e.target.value } : prev)}
                        onBlur={() => commit(m)}
                        onKeyDown={e => { if (e.key === 'Enter') commit(m); if (e.key === 'Escape') setEdit(null) }}
                        className="editing w-full px-3 py-1.5 text-sm text-right num"
                        style={{ minWidth: 80 }}
                      />
                    </td>
                  ) : (
                    <td
                      className="t-cell px-3 py-1.5 num text-right editable"
                      onClick={() => startEdit(m, 'adjustment', String(m.adjustment || 0))}
                    >
                      {fmt(m.adjustment)}
                    </td>
                  )}

                  {/* Result */}
                  <td className={`t-cell px-3 py-1.5 num text-right font-semibold ${m.result >= 0 ? 'pos' : 'neg'}`}>
                    {m.result >= 0 ? '+' : '–'}{fmt(Math.abs(m.result))}
                  </td>

                  {/* Savings */}
                  <td className={`t-cell px-3 py-1.5 num text-right font-bold ${m.savings >= 0 ? 'pos' : 'neg'}`}>
                    {fmt(m.savings)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
