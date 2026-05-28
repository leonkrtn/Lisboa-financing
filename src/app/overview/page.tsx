'use client'
import { useEffect, useState } from 'react'
import KPICard from '@/components/KPICard'
import SavingsChart from '@/components/SavingsChart'
import { fmt } from '@/lib/calculations'
import type { CalculatedMonth } from '@/types'

export default function OverviewPage() {
  const [months, setMonths] = useState<CalculatedMonth[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/months/calculated')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setMonths(data)
        else setError('Failed to load data')
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  const today = new Date().toISOString().slice(0, 10)

  const totalSavings = months.length > 0 ? months[months.length - 1].savings : 0
  const avgResult =
    months.length > 0 ? months.reduce((s, m) => s + m.result, 0) / months.length : 0
  const nextFutureMonth = months.find(m => m.month_date >= today)
  const nextMonthNet = nextFutureMonth ? nextFutureMonth.salary : 0
  const avgCost =
    months.length > 0
      ? months.reduce(
          (s, m) =>
            s + m.rent + m.food + m.fun + m.other + m.insurance + m.flights + m.gym_transport,
          0
        ) / months.length
      : 0

  const chartData = months.map(m => ({
    label: m.label,
    savings: m.savings,
    result: m.result,
  }))

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <h1 className="text-xl font-bold text-[#1A1A1A] mb-6">Overview</h1>
        <div className="flex gap-4 flex-wrap mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="border border-[#E5E5E5] bg-[#F8F8F8] p-5 min-w-[160px] h-20 animate-pulse" />
          ))}
        </div>
        <div className="border border-[#E5E5E5] h-[260px] bg-[#F8F8F8] animate-pulse mb-8" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 md:p-8">
        <h1 className="text-xl font-bold text-[#1A1A1A] mb-4">Overview</h1>
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-xl font-bold text-[#1A1A1A] mb-6">Overview</h1>

      {/* KPI Cards */}
      <div className="flex gap-4 flex-wrap mb-8">
        <KPICard
          label="Total Savings"
          value={`€ ${fmt(totalSavings)}`}
          positive={totalSavings >= 0 ? true : false}
        />
        <KPICard
          label="Avg Monthly Result"
          value={`€ ${fmt(avgResult)}`}
          positive={avgResult >= 0 ? true : false}
        />
        <KPICard
          label="Next Month Net"
          value={`€ ${fmt(nextMonthNet)}`}
          sub={nextFutureMonth?.label ?? '—'}
        />
        <KPICard
          label="Avg Monthly Cost"
          value={`€ ${fmt(avgCost)}`}
          positive={null}
        />
      </div>

      {/* Savings Chart */}
      <div className="border border-[#E5E5E5] p-4 mb-8">
        <div className="text-sm font-semibold text-[#1A1A1A] mb-3">Savings & Monthly Result</div>
        <SavingsChart data={chartData} />
      </div>

      {/* Summary Table */}
      <div className="border border-[#E5E5E5] overflow-x-auto">
        <div className="px-4 py-3 border-b border-[#E5E5E5] bg-[#F8F8F8]">
          <span className="text-sm font-semibold text-[#1A1A1A]">Monthly Summary</span>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="table-header">Month</th>
              <th className="table-header text-right">Result</th>
              <th className="table-header text-right">Savings</th>
              <th className="table-header">Income / Internship</th>
            </tr>
          </thead>
          <tbody>
            {months.map(m => (
              <tr
                key={m.month_date}
                className={m.internship ? 'bg-blue-50' : m.month_date === today.slice(0, 7) + '-01' ? 'bg-yellow-50' : ''}
              >
                <td className="table-cell font-medium">{m.label}</td>
                <td className={`table-cell text-right ${m.result >= 0 ? 'positive' : 'negative'}`}>
                  € {fmt(m.result)}
                </td>
                <td className={`table-cell text-right ${m.savings >= 0 ? 'positive' : 'negative'}`}>
                  € {fmt(m.savings)}
                </td>
                <td className="table-cell text-gray-600">
                  {m.internship ? (
                    <span className="text-blue-700 font-medium">{m.internship.name}</span>
                  ) : m.income_type ? (
                    m.income_type.name
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
