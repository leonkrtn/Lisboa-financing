'use client'
import { useEffect, useState } from 'react'
import KPICard from '@/components/KPICard'
import SavingsChart from '@/components/SavingsChart'
import { fmt } from '@/lib/calculations'
import type { CalculatedMonth } from '@/types'

interface UpcomingEvent {
  date: string
  label: string
  type: 'internship-start' | 'internship-end' | 'flight' | 'fee'
}

function buildUpcomingEvents(months: CalculatedMonth[], today: string): UpcomingEvent[] {
  const events: UpcomingEvent[] = []

  for (const m of months) {
    // Internship start/end
    if (m.internship) {
      if (m.internship.start_date >= today) {
        events.push({
          date: m.internship.start_date,
          label: `${m.internship.name} starts`,
          type: 'internship-start',
        })
      }
      if (m.internship.end_date >= today) {
        events.push({
          date: m.internship.end_date,
          label: `${m.internship.name} ends`,
          type: 'internship-end',
        })
      }
    }
    // Flight
    if (m.has_flight && m.month_date >= today.slice(0, 7) + '-01') {
      events.push({
        date: m.month_date,
        label: `Flight (${m.label})`,
        type: 'flight',
      })
    }
    // Annual fee
    if (m.annual_fee > 0 && m.month_date >= today.slice(0, 7) + '-01') {
      events.push({
        date: m.month_date,
        label: `Annual fee € ${fmt(m.annual_fee)} (${m.label})`,
        type: 'fee',
      })
    }
    // Tuition
    if (m.tuition_fee > 0 && m.month_date >= today.slice(0, 7) + '-01') {
      events.push({
        date: m.month_date,
        label: `Tuition € ${fmt(m.tuition_fee)} (${m.label})`,
        type: 'fee',
      })
    }
  }

  // Deduplicate internship start/end by unique date+label
  const seen = new Set<string>()
  const deduped = events.filter(e => {
    const key = `${e.date}|${e.label}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return deduped.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5)
}

const eventDotColors: Record<UpcomingEvent['type'], string> = {
  'internship-start': 'bg-[#1E3A8A]',
  'internship-end': 'bg-[#60A5FA]',
  flight: 'bg-[#F59E0B]',
  fee: 'bg-[#DC2626]',
}

// Icons
function PiggyBankIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 11c0-4.418-3.134-8-7-8S5 6.582 5 11v2a3 3 0 0 0 1.5 2.6V17a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-1.4A3 3 0 0 0 19 13v-2z"/>
      <path d="M12 6v1M9.5 15.5s.5 1 2.5 1 2.5-1 2.5-1"/>
      <path d="M19 11h2a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-2"/>
    </svg>
  )
}

function ChartBarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" rx="1"/>
      <rect x="10" y="7" width="4" height="14" rx="1"/>
      <rect x="17" y="3" width="4" height="18" rx="1"/>
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  )
}

function ReceiptIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2"/>
      <path d="M8 8h8M8 12h8M8 16h4"/>
    </svg>
  )
}

export default function OverviewPage() {
  const [months, setMonths] = useState<CalculatedMonth[]>([])
  const [config, setConfig] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/months/calculated').then(r => r.json()),
      fetch('/api/config').then(r => r.json()),
    ])
      .then(([calcData, configData]) => {
        if (Array.isArray(calcData)) setMonths(calcData)
        else setError('Failed to load data')
        if (configData && typeof configData === 'object') setConfig(configData)
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const todayMonth = today.slice(0, 7) + '-01'

  // KPI computations
  const lastMonth = months.length > 0 ? months[months.length - 1] : null
  const totalSavings = lastMonth ? lastMonth.savings : 0
  const avgResult =
    months.length > 0 ? months.reduce((s, m) => s + m.result, 0) / months.length : 0
  const nextFutureMonth = months.find(m => m.month_date >= todayMonth)
  const nextMonthNet = nextFutureMonth ? nextFutureMonth.salary : 0
  const avgCost =
    months.length > 0
      ? months.reduce(
          (s, m) => s + m.rent + m.food + m.fun + m.other + m.insurance + m.flights,
          0
        ) / months.length
      : 0

  const chartData = months.map(m => ({
    label: m.label,
    savings: m.savings,
    result: m.result,
  }))

  // Savings goal
  const savingsGoal = parseFloat(config.savings_goal || '0')
  const savingsProgress = savingsGoal > 0 ? Math.min((totalSavings / savingsGoal) * 100, 100) : 0

  // Current month cashflow
  const currentMonth = nextFutureMonth ?? (months.length > 0 ? months[months.length - 1] : null)
  const income = currentMonth ? currentMonth.salary + currentMonth.support : 0
  const costs = currentMonth
    ? currentMonth.rent + currentMonth.food + currentMonth.fun + currentMonth.other +
      currentMonth.insurance + currentMonth.flights + currentMonth.tuition_fee + currentMonth.annual_fee
    : 0
  const totalCashflow = income + costs
  const incomePercent = totalCashflow > 0 ? (income / totalCashflow) * 100 : 0
  const costsPercent = totalCashflow > 0 ? (costs / totalCashflow) * 100 : 0

  // Upcoming events
  const upcomingEvents = buildUpcomingEvents(months, today)

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Overview</h1>
        <div className="flex gap-4 flex-wrap mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-5 min-w-[200px] h-32 animate-pulse bg-[#F1F5F9]" />
          ))}
        </div>
        <div className="card h-[300px] animate-pulse bg-[#F1F5F9] mb-8" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 md:p-8">
        <h1 className="text-2xl font-bold text-[#0F172A] mb-4">Overview</h1>
        <div className="text-[#DC2626] text-sm bg-[#FEF2F2] border border-red-200 rounded-lg px-4 py-3">{error}</div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-screen-xl">
      <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Overview</h1>

      {/* KPI Cards */}
      <div className="flex gap-4 flex-wrap mb-8">
        <KPICard
          label="Total Savings"
          value={`€ ${fmt(totalSavings)}`}
          trend={totalSavings >= 0 ? 'up' : 'down'}
          sub={lastMonth ? `as of ${lastMonth.label}` : undefined}
          color={totalSavings >= 0 ? 'green' : 'red'}
          icon={<PiggyBankIcon />}
        />
        <KPICard
          label="Avg Monthly Result"
          value={`€ ${fmt(avgResult)}`}
          trend={avgResult >= 0 ? 'up' : 'down'}
          sub="across all months"
          color={avgResult >= 0 ? 'green' : 'red'}
          icon={<ChartBarIcon />}
        />
        <KPICard
          label="Next Month Net"
          value={`€ ${fmt(nextMonthNet)}`}
          sub={nextFutureMonth?.label ?? '—'}
          color="blue"
          icon={<CalendarIcon />}
        />
        <KPICard
          label="Avg Monthly Cost"
          value={`€ ${fmt(avgCost)}`}
          sub="excl. support income"
          color="neutral"
          icon={<ReceiptIcon />}
        />
      </div>

      {/* Chart + Sidebar grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        {/* Area Chart — 60% */}
        <div className="card p-5 lg:col-span-3">
          <div className="text-sm font-semibold text-[#0F172A] mb-4">Savings Over Time</div>
          <SavingsChart data={chartData} />
        </div>

        {/* Right column — 40% */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Savings Progress */}
          <div className="card p-5">
            <div className="text-sm font-semibold text-[#0F172A] mb-3">Savings Goal Progress</div>
            {savingsGoal > 0 ? (
              <>
                <div className="flex justify-between text-xs text-[#64748B] mb-2">
                  <span>€ {fmt(totalSavings)}</span>
                  <span>€ {fmt(savingsGoal)}</span>
                </div>
                <div className="w-full h-3 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1E3A8A] rounded-full transition-all"
                    style={{ width: `${savingsProgress}%` }}
                  />
                </div>
                <div className="text-xs text-[#64748B] mt-2 text-right">
                  {savingsProgress.toFixed(1)}% of goal
                </div>
              </>
            ) : (
              <p className="text-sm text-[#64748B]">Set a goal in Config to track progress.</p>
            )}
          </div>

          {/* Cashflow Bar */}
          <div className="card p-5">
            <div className="text-sm font-semibold text-[#0F172A] mb-1">Current Month Cashflow</div>
            {currentMonth && (
              <div className="text-xs text-[#64748B] mb-3">{currentMonth.label}</div>
            )}
            {totalCashflow > 0 ? (
              <>
                <div className="w-full h-3 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-[#1E3A8A] transition-all"
                    style={{ width: `${incomePercent}%` }}
                  />
                  <div
                    className="h-full bg-[#DC2626] transition-all"
                    style={{ width: `${costsPercent}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#1E3A8A] inline-block" />
                    <span className="text-[#64748B]">Income</span>
                    <span className="font-semibold text-[#0F172A]">€ {fmt(income)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#DC2626] inline-block" />
                    <span className="text-[#64748B]">Costs</span>
                    <span className="font-semibold text-[#0F172A]">€ {fmt(costs)}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-[#64748B]">No cashflow data available.</p>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="card p-5 flex-1">
            <div className="text-sm font-semibold text-[#0F172A] mb-3">Upcoming Events</div>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-[#64748B]">No upcoming events.</p>
            ) : (
              <ul className="space-y-2.5">
                {upcomingEvents.map((ev, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${eventDotColors[ev.type]}`} />
                    <div>
                      <div className="text-sm text-[#0F172A]">{ev.label}</div>
                      <div className="text-xs text-[#64748B]">{ev.date}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Current Month Breakdown */}
      {currentMonth && (
        <div className="card mb-8">
          <div className="px-5 py-4 border-b border-[#E2E8F0]">
            <div className="text-sm font-semibold text-[#0F172A]">
              Current Month Breakdown — {currentMonth.label}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="th">Category</th>
                  <th className="th text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Salary', value: currentMonth.salary, always: true },
                  { label: 'Support', value: currentMonth.support, always: false },
                  { label: 'Rent', value: -currentMonth.rent, always: false },
                  { label: 'Food', value: -currentMonth.food, always: false },
                  { label: 'Fun', value: -currentMonth.fun, always: false },
                  { label: 'Insurance', value: -currentMonth.insurance, always: false },
                  { label: 'Flights', value: -currentMonth.flights, always: false },
                  { label: 'Other', value: -currentMonth.other, always: false },
                  { label: 'Tuition Fee', value: -currentMonth.tuition_fee, always: false },
                  { label: 'Annual Fee', value: -currentMonth.annual_fee, always: false },
                  { label: 'Adjustment', value: -currentMonth.adjustment, always: false },
                ]
                  .filter(row => row.always || row.value !== 0)
                  .map((row, idx) => (
                    <tr key={row.label}>
                      <td className="td">{row.label}</td>
                      <td className={`td text-right ${row.value >= 0 ? 'text-[#0F172A]' : 'text-[#DC2626]'}`}>
                        {row.value >= 0 ? '' : '−'}€ {fmt(Math.abs(row.value))}
                      </td>
                    </tr>
                  ))}
                {/* Result row */}
                <tr>
                  <td className="td font-bold text-[#0F172A]">Result</td>
                  <td className={`td text-right font-bold ${currentMonth.result >= 0 ? 'positive' : 'negative'}`}>
                    {currentMonth.result >= 0 ? '+' : '−'}€ {fmt(Math.abs(currentMonth.result))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Summary Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0]">
          <div className="text-sm font-semibold text-[#0F172A]">Monthly Summary</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="th">Month</th>
                <th className="th text-right">Result</th>
                <th className="th text-right">Savings</th>
                <th className="th">Income / Internship</th>
              </tr>
            </thead>
            <tbody>
              {months.map(m => (
                <tr key={m.month_date}>
                  <td className="td font-medium">
                    <div className="flex flex-col">
                      <span>{m.label}</span>
                      {m.internship && (
                        <span className="text-xs text-[#1E3A8A]">{m.internship.name}</span>
                      )}
                    </div>
                  </td>
                  <td className={`td text-right font-medium ${m.result >= 0 ? 'positive' : 'negative'}`}>
                    € {fmt(m.result)}
                  </td>
                  <td className={`td text-right font-medium ${m.savings >= 0 ? 'positive' : 'negative'}`}>
                    € {fmt(m.savings)}
                  </td>
                  <td className="td text-[#64748B]">
                    {m.internship ? (
                      <span className="text-[#1E3A8A] font-medium">{m.internship.name}</span>
                    ) : m.income_type ? (
                      m.income_type.name
                    ) : (
                      <span className="text-[#64748B]">—</span>
                    )}
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
