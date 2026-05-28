'use client'
import { useEffect, useState, useCallback } from 'react'
import InlineEdit from '@/components/InlineEdit'
import { fmt } from '@/lib/calculations'
import type { CalculatedMonth, IncomeType } from '@/types'

export default function MonthsPage() {
  const [months, setMonths] = useState<CalculatedMonth[]>([])
  const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const incomeTypeOptions = incomeTypes.map(it => ({
    value: it.id,
    label: it.name,
  }))

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <h1 className="text-xl font-bold text-[#1A1A1A] mb-6">Months</h1>
        <div className="border border-[#E5E5E5] h-48 bg-[#F8F8F8] animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 md:p-8">
        <h1 className="text-xl font-bold text-[#1A1A1A] mb-4">Months</h1>
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-xl font-bold text-[#1A1A1A] mb-6">Months</h1>

      <div className="text-xs text-gray-400 mb-3">
        Click any highlighted cell to edit. Internship months are shown in blue.
      </div>

      <div className="border border-[#E5E5E5] overflow-x-auto">
        <table className="border-collapse" style={{ minWidth: '1200px' }}>
          <thead>
            <tr>
              <th className="table-header sticky left-0 z-10 bg-[#F8F8F8]">Month</th>
              <th className="table-header bg-[#FFFDF5]">Income Type</th>
              <th className="table-header bg-[#FFFDF5]">Manual Salary</th>
              <th className="table-header bg-[#FFFDF5]">Has Flight</th>
              <th className="table-header bg-[#FFFDF5]">Tuition Fee</th>
              <th className="table-header bg-[#FFFDF5]">Annual Fee</th>
              <th className="table-header bg-[#FFFDF5]">Adjustment</th>
              <th className="table-header">[Salary]</th>
              <th className="table-header">[Support]</th>
              <th className="table-header">[Rent]</th>
              <th className="table-header">[Food]</th>
              <th className="table-header">[Fun]</th>
              <th className="table-header">[Insurance]</th>
              <th className="table-header">[Flights]</th>
              <th className="table-header">[Other]</th>
              <th className="table-header">[Result]</th>
              <th className="table-header">[Savings]</th>
            </tr>
          </thead>
          <tbody>
            {months.map(m => (
              <tr
                key={m.month_date}
                className={m.internship ? 'bg-blue-50' : ''}
              >
                {/* Month - sticky */}
                <td
                  className="table-cell sticky left-0 z-10 font-medium"
                  style={{ background: m.internship ? '#EFF6FF' : '#FFFFFF' }}
                >
                  <div className="flex flex-col">
                    <span>{m.label}</span>
                    {m.internship && (
                      <span className="text-xs text-blue-600 font-normal">{m.internship.name}</span>
                    )}
                  </div>
                </td>

                {/* Income Type */}
                <td className="table-cell editable-cell p-0">
                  {m.internship ? (
                    <span className="px-3 py-1.5 text-xs text-blue-500 italic block">Internship</span>
                  ) : (
                    <InlineEdit
                      value={m.income_type_id ?? ''}
                      type="select"
                      options={incomeTypeOptions}
                      onSave={v => saveMonthField(m, 'income_type_id', v)}
                      className="px-3 py-1.5"
                      format={() =>
                        m.income_type ? m.income_type.name : '—'
                      }
                    />
                  )}
                </td>

                {/* Manual Salary */}
                <td className="table-cell editable-cell p-0">
                  {m.internship ? (
                    <span className="px-3 py-1.5 text-xs text-blue-500 italic block">—</span>
                  ) : (
                    <InlineEdit
                      value={m.manual_salary}
                      type="number"
                      onSave={v => saveMonthField(m, 'manual_salary', v)}
                      className="px-3 py-1.5"
                      format={v => (v === null || v === undefined || v === '') ? '—' : `€ ${fmt(Number(v))}`}
                    />
                  )}
                </td>

                {/* Has Flight */}
                <td className="table-cell editable-cell p-0">
                  <InlineEdit
                    value={m.has_flight}
                    type="boolean"
                    onSave={v => saveMonthField(m, 'has_flight', v)}
                    className="px-3 py-1.5"
                  />
                </td>

                {/* Tuition Fee */}
                <td className="table-cell editable-cell p-0">
                  <InlineEdit
                    value={m.tuition_fee}
                    type="number"
                    onSave={v => saveMonthField(m, 'tuition_fee', v)}
                    className="px-3 py-1.5"
                    format={v => v ? `€ ${fmt(Number(v))}` : '—'}
                  />
                </td>

                {/* Annual Fee */}
                <td className="table-cell editable-cell p-0">
                  <InlineEdit
                    value={m.annual_fee}
                    type="number"
                    onSave={v => saveMonthField(m, 'annual_fee', v)}
                    className="px-3 py-1.5"
                    format={v => v ? `€ ${fmt(Number(v))}` : '—'}
                  />
                </td>

                {/* Adjustment */}
                <td className="table-cell editable-cell p-0">
                  <InlineEdit
                    value={m.adjustment}
                    type="number"
                    onSave={v => saveMonthField(m, 'adjustment', v)}
                    className="px-3 py-1.5"
                    format={v => v ? `€ ${fmt(Number(v))}` : '—'}
                  />
                </td>

                {/* Calculated: Salary */}
                <td className="table-cell text-right">€ {fmt(m.salary)}</td>

                {/* Calculated: Support */}
                <td className="table-cell text-right">
                  {m.support > 0 ? `€ ${fmt(m.support)}` : '—'}
                </td>

                {/* Calculated: Rent */}
                <td className="table-cell text-right">
                  {m.rent > 0 ? `€ ${fmt(m.rent)}` : '—'}
                </td>

                {/* Calculated: Food */}
                <td className="table-cell text-right">
                  {m.food > 0 ? `€ ${fmt(m.food)}` : '—'}
                </td>

                {/* Calculated: Fun */}
                <td className="table-cell text-right">
                  {m.fun > 0 ? `€ ${fmt(m.fun)}` : '—'}
                </td>

                {/* Calculated: Insurance */}
                <td className="table-cell text-right">
                  {m.insurance > 0 ? `€ ${fmt(m.insurance)}` : '—'}
                </td>

                {/* Calculated: Flights */}
                <td className="table-cell text-right">
                  {m.flights > 0 ? `€ ${fmt(m.flights)}` : '—'}
                </td>

                {/* Calculated: Other */}
                <td className="table-cell text-right">
                  {m.other > 0 ? `€ ${fmt(m.other)}` : '—'}
                </td>

                {/* Calculated: Result */}
                <td className={`table-cell text-right font-medium ${m.result >= 0 ? 'positive' : 'negative'}`}>
                  € {fmt(m.result)}
                </td>

                {/* Calculated: Savings */}
                <td className={`table-cell text-right font-medium ${m.savings >= 0 ? 'positive' : 'negative'}`}>
                  € {fmt(m.savings)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
