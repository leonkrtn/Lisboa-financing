'use client'
import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { CalculatedMonth } from '@/types'
import { fmt } from '@/lib/calculations'

export default function OverviewPage() {
  const [months, setMonths] = useState<CalculatedMonth[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch('/api/months/calculated')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => { setMonths(d); setLoading(false) })
      .catch(e => { setErr(e.message); setLoading(false) })
  }, [])

  if (loading) return <Center>Loading…</Center>
  if (err) return <Center red>Error: {err}</Center>
  if (!months.length) return <Center>No data — configure settings first.</Center>

  const initialSavings = months[0].savings - months[0].result
  const finalSavings = months[months.length - 1].savings
  const avgResult = months.reduce((s, m) => s + m.result, 0) / months.length
  const minSavings = Math.min(...months.map(m => m.savings))
  const zeroIdx = months.findIndex(m => m.savings <= 0)

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Starting Balance', value: initialSavings },
          { label: 'Avg Monthly Result', value: avgResult },
          { label: 'Lowest Point', value: minSavings },
          { label: 'Final Balance', value: finalSavings },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg border border-[#E5E7EB] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1">{k.label}</p>
            <p className={`text-2xl font-bold num ${k.value >= 0 ? 'pos' : 'neg'}`}>
              {k.value < 0 ? '–' : ''}€{fmt(Math.abs(k.value))}
            </p>
          </div>
        ))}
      </div>

      {/* Savings chart */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-5">
        <h2 className="text-sm font-semibold mb-4">Savings Trajectory</h2>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={months} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `€${Math.round(v / 1000)}k`}
              width={52}
            />
            <Tooltip
              formatter={(v: number) => [`€${fmt(v)}`, 'Savings']}
              contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #E5E7EB', boxShadow: 'none' }}
            />
            <ReferenceLine y={0} stroke="#E5E7EB" />
            <Area
              type="monotone"
              dataKey="savings"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#grad)"
              dot={false}
              activeDot={{ r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        {zeroIdx !== -1 && (
          <p className="mt-3 text-xs text-[#DC2626]">
            Savings run out in <strong>{months[zeroIdx].label}</strong>{' '}
            ({zeroIdx + 1} month{zeroIdx !== 0 ? 's' : ''} from start)
          </p>
        )}
      </div>

      {/* Full months table */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="text-sm font-semibold">Monthly Breakdown</h2>
          <a href="/months" className="text-xs text-[#3B82F6] hover:underline">Edit in planner →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                {['Month', 'Type', 'Salary', 'Support', 'Rent', 'Food', 'Fun', 'Other', 'Ins', 'Flt', 'Tuition', 'Annual', 'Adj', 'Result', 'Savings'].map((h, i) => (
                  <th key={h} className={`t-head px-3 py-2 whitespace-nowrap ${i < 2 ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map(m => (
                <tr key={m.month_date} className={`t-row${m.internship ? ' bg-amber-50' : ''}`}>
                  <td className="t-cell px-3 py-1.5 font-medium whitespace-nowrap">
                    {m.label}{m.has_flight && <span className="ml-1 text-xs text-[#6B7280]">✈</span>}
                  </td>
                  <td className="t-cell px-3 py-1.5 text-xs text-[#6B7280] whitespace-nowrap">
                    {m.internship
                      ? <span className="bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">{m.internship.name}</span>
                      : (m.income_type?.name ?? '—')}
                  </td>
                  <td className={`t-cell px-3 py-1.5 num text-right ${m.salary > 0 ? 'pos' : ''}`}>{fmt(m.salary)}</td>
                  <td className={`t-cell px-3 py-1.5 num text-right ${m.support > 0 ? 'pos' : 'text-[#9CA3AF]'}`}>{fmt(m.support)}</td>
                  <td className="t-cell px-3 py-1.5 num text-right neg">{fmt(m.rent)}</td>
                  <td className="t-cell px-3 py-1.5 num text-right neg">{fmt(m.food)}</td>
                  <td className="t-cell px-3 py-1.5 num text-right neg">{fmt(m.fun)}</td>
                  <td className="t-cell px-3 py-1.5 num text-right neg">{fmt(m.other)}</td>
                  <td className="t-cell px-3 py-1.5 num text-right neg">{fmt(m.insurance)}</td>
                  <td className="t-cell px-3 py-1.5 num text-right neg">{fmt(m.flights)}</td>
                  <td className="t-cell px-3 py-1.5 num text-right neg">{fmt(m.tuition_fee)}</td>
                  <td className="t-cell px-3 py-1.5 num text-right neg">{fmt(m.annual_fee)}</td>
                  <td className="t-cell px-3 py-1.5 num text-right">{fmt(m.adjustment)}</td>
                  <td className={`t-cell px-3 py-1.5 num text-right font-semibold ${m.result >= 0 ? 'pos' : 'neg'}`}>
                    {m.result >= 0 ? '+' : '–'}{fmt(Math.abs(m.result))}
                  </td>
                  <td className={`t-cell px-3 py-1.5 num text-right font-bold ${m.savings >= 0 ? 'pos' : 'neg'}`}>
                    {fmt(m.savings)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Center({ children, red }: { children: React.ReactNode; red?: boolean }) {
  return (
    <div className={`flex h-64 items-center justify-center text-sm ${red ? 'text-[#DC2626]' : 'text-[#9CA3AF]'}`}>
      {children}
    </div>
  )
}
