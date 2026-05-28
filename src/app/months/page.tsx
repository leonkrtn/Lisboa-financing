'use client'
import { useEffect, useState, useCallback } from 'react'
import InlineEdit from '@/components/InlineEdit'
import { fmt } from '@/lib/calculations'
import type { CalculatedMonth, IncomeType } from '@/types'

type FilterType = 'all' | 'future' | 'past' | 'internship'
type SortKey = 'month_date' | 'salary' | 'result' | 'savings'
type SortDir = 'asc' | 'desc'

export default function MonthsPage() {
  const [months, setMonths] = useState<CalculatedMonth[]>([])
  const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortKey, setSortKey] = useState<SortKey>('month_date')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const fetchData = useCallback(async () => {
    try {
      const [calcRes, itRes] = await Promise.all([
        fetch('/api/months/calculated'),
        fetch('/api/income-types'),
      ])
      const calcData = await calcRes.json()
      const itData = await itRes.json()
      if (Array.isArray(calcData)) setMonths(calcData)
      if (Array.isArray(itData)) setIncomeTypes(itData)
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function saveMonthField(month: CalculatedMonth, field: string, value: string) {
    const body: Record<string, string | number | boolean | null> = {
      month_date: month.month_date,
      income_type_id: month.income_type_id,
      manual_salary: month.manual_salary,
      tuition_fee: month.tuition_fee,
      annual_fee: month.annual_fee,
      adjustment: month.adjustment,
      has_flight: month.has_flight,
    }

    if (field === 'income_type_id') body.income_type_id = value || null
    else if (field === 'manual_salary') body.manual_salary = value === '' ? null : Number(value)
    else if (field === 'has_flight') body.has_flight = value === 'true'
    else if (field === 'tuition_fee') body.tuition_fee = Number(value) || 0
    else if (field === 'annual_fee') body.annual_fee = Number(value) || 0
    else if (field === 'adjustment') body.adjustment = Number(value) || 0

    await fetch('/api/months', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    await fetchData()
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null
    return sortDir === 'asc' ? ' ▲' : ' ▼'
  }

  const incomeTypeOptions = incomeTypes.map(it => ({
    value: it.id,
    label: it.name,
  }))

  const today = new Date().toISOString().slice(0, 10)
  const todayMonth = today.slice(0, 7) + '-01'

  // Filter
  const filtered = months.filter(m => {
    if (filter === 'future') return m.month_date >= todayMonth
    if (filter === 'past') return m.month_date < todayMonth
    if (filter === 'internship') return m.internship !== null
    return true
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let aVal: number | string = 0
    let bVal: number | string = 0
    if (sortKey === 'month_date') {
      aVal = a.month_date
      bVal = b.month_date
    } else if (sortKey === 'salary') {
      aVal = a.salary
      bVal = b.salary
    } else if (sortKey === 'result') {
      aVal = a.result
      bVal = b.result
    } else if (sortKey === 'savings') {
      aVal = a.savings
      bVal = b.savings
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'future', label: 'Future' },
    { key: 'past', label: 'Past' },
    { key: 'internship', label: 'Internship Months' },
  ]

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Months</h1>
        <div className="card h-48 animate-pulse bg-[#F1F5F9]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 md:p-8">
        <h1 className="text-2xl font-bold text-[#0F172A] mb-4">Months</h1>
        <div className="text-[#DC2626] text-sm bg-[#FEF2F2] border border-red-200 rounded-lg px-4 py-3">{error}</div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Months</h1>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        {filterButtons.map(btn => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              filter === btn.key
                ? 'bg-[#1E3A8A] text-white'
                : 'border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9]'
            }`}
          >
            {btn.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-[#64748B]">
          {sorted.length} month{sorted.length !== 1 ? 's' : ''}
        </span>
      </div>

      <p className="text-xs text-[#64748B] mb-4">
        Click any editable cell (Income Type, Manual Salary, Has Flight, Tuition, Annual Fee, Adjustment) to edit inline.
      </p>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="border-collapse" style={{ minWidth: '1200px' }}>
            <thead>
              <tr>
                <th
                  className="th sortable sticky left-0 z-10 bg-[#F1F5F9]"
                  onClick={() => handleSort('month_date')}
                >
                  Month{sortIndicator('month_date')}
                </th>
                <th className="th">Income Type</th>
                <th
                  className="th sortable"
                  onClick={() => handleSort('salary')}
                >
                  Manual Salary{sortIndicator('salary')}
                </th>
                <th className="th">Has Flight</th>
                <th className="th">Tuition Fee</th>
                <th className="th">Annual Fee</th>
                <th className="th">Adjustment</th>
                <th
                  className="th sortable text-right"
                  onClick={() => handleSort('salary')}
                >
                  [Salary]{sortIndicator('salary')}
                </th>
                <th className="th text-right">[Support]</th>
                <th className="th text-right">[Rent]</th>
                <th className="th text-right">[Food]</th>
                <th className="th text-right">[Fun]</th>
                <th className="th text-right">[Insurance]</th>
                <th className="th text-right">[Flights]</th>
                <th className="th text-right">[Other]</th>
                <th
                  className="th sortable text-right"
                  onClick={() => handleSort('result')}
                >
                  [Result]{sortIndicator('result')}
                </th>
                <th
                  className="th sortable text-right"
                  onClick={() => handleSort('savings')}
                >
                  [Savings]{sortIndicator('savings')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(m => {
                const isInternship = m.internship !== null
                const stickyBg = isInternship ? '#EFF6FF' : undefined
                return (
                  <tr key={m.month_date}>
                    {/* Month - sticky */}
                    <td
                      className="td sticky left-0 z-10 font-medium"
                      style={{ backgroundColor: stickyBg ?? (undefined) }}
                    >
                      <div className="flex flex-col">
                        <span>{m.label}</span>
                        {isInternship && (
                          <span className="text-xs text-[#1E3A8A] font-normal">{m.internship!.name}</span>
                        )}
                      </div>
                    </td>

                    {/* Income Type */}
                    <td className="td p-0 hover:bg-[#EFF6FF]">
                      {isInternship ? (
                        <span className="px-4 py-2 text-xs text-[#1E3A8A] italic block">Internship</span>
                      ) : (
                        <InlineEdit
                          value={m.income_type_id ?? ''}
                          type="select"
                          options={incomeTypeOptions}
                          onSave={v => saveMonthField(m, 'income_type_id', v)}
                          className="px-4 py-2"
                          format={() => m.income_type ? m.income_type.name : '—'}
                        />
                      )}
                    </td>

                    {/* Manual Salary */}
                    <td className="td p-0 hover:bg-[#EFF6FF]">
                      {isInternship ? (
                        <span className="px-4 py-2 text-xs text-[#64748B] block">—</span>
                      ) : (
                        <InlineEdit
                          value={m.manual_salary}
                          type="number"
                          onSave={v => saveMonthField(m, 'manual_salary', v)}
                          className="px-4 py-2"
                          format={v => (v === null || v === undefined || v === '') ? '—' : `€ ${fmt(Number(v))}`}
                        />
                      )}
                    </td>

                    {/* Has Flight */}
                    <td className="td p-0 hover:bg-[#EFF6FF]">
                      <InlineEdit
                        value={m.has_flight}
                        type="boolean"
                        onSave={v => saveMonthField(m, 'has_flight', v)}
                        className="px-4 py-2"
                      />
                    </td>

                    {/* Tuition Fee */}
                    <td className="td p-0 hover:bg-[#EFF6FF]">
                      <InlineEdit
                        value={m.tuition_fee}
                        type="number"
                        onSave={v => saveMonthField(m, 'tuition_fee', v)}
                        className="px-4 py-2"
                        format={v => v ? `€ ${fmt(Number(v))}` : '—'}
                      />
                    </td>

                    {/* Annual Fee */}
                    <td className="td p-0 hover:bg-[#EFF6FF]">
                      <InlineEdit
                        value={m.annual_fee}
                        type="number"
                        onSave={v => saveMonthField(m, 'annual_fee', v)}
                        className="px-4 py-2"
                        format={v => v ? `€ ${fmt(Number(v))}` : '—'}
                      />
                    </td>

                    {/* Adjustment */}
                    <td className="td p-0 hover:bg-[#EFF6FF]">
                      <InlineEdit
                        value={m.adjustment}
                        type="number"
                        onSave={v => saveMonthField(m, 'adjustment', v)}
                        className="px-4 py-2"
                        format={v => v ? `€ ${fmt(Number(v))}` : '—'}
                      />
                    </td>

                    {/* Calculated: Salary */}
                    <td className="td text-right">€ {fmt(m.salary)}</td>

                    {/* Calculated: Support */}
                    <td className="td text-right">
                      {m.support > 0 ? `€ ${fmt(m.support)}` : '—'}
                    </td>

                    {/* Calculated: Rent */}
                    <td className="td text-right">
                      {m.rent > 0 ? `€ ${fmt(m.rent)}` : '—'}
                    </td>

                    {/* Calculated: Food */}
                    <td className="td text-right">
                      {m.food > 0 ? `€ ${fmt(m.food)}` : '—'}
                    </td>

                    {/* Calculated: Fun */}
                    <td className="td text-right">
                      {m.fun > 0 ? `€ ${fmt(m.fun)}` : '—'}
                    </td>

                    {/* Calculated: Insurance */}
                    <td className="td text-right">
                      {m.insurance > 0 ? `€ ${fmt(m.insurance)}` : '—'}
                    </td>

                    {/* Calculated: Flights */}
                    <td className="td text-right">
                      {m.flights > 0 ? `€ ${fmt(m.flights)}` : '—'}
                    </td>

                    {/* Calculated: Other */}
                    <td className="td text-right">
                      {m.other > 0 ? `€ ${fmt(m.other)}` : '—'}
                    </td>

                    {/* Calculated: Result */}
                    <td className={`td text-right font-medium ${m.result >= 0 ? 'positive' : 'negative'}`}>
                      € {fmt(m.result)}
                    </td>

                    {/* Calculated: Savings */}
                    <td className={`td text-right font-medium ${m.savings >= 0 ? 'positive' : 'negative'}`}>
                      € {fmt(m.savings)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
