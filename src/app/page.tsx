'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { CalculatedMonth } from '@/types'
import { fmt } from '@/lib/calculations'

interface CalcResponse {
  months: CalculatedMonth[]
  net_capital: number
}

export default function DashboardPage() {
  const [data, setData] = useState<CalcResponse | null>(null)
  const [netCapital, setNetCapital] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/calculated').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
      fetch('/api/capital-items').then(r => r.ok ? r.json() : []),
    ])
      .then(([calc, capitalItems]) => {
        setData(calc)
        // Compute net capital directly from capital items (Cash+Receivables − Payables−Provisions)
        const nc = (Array.isArray(capitalItems) ? capitalItems : []).reduce((sum: number, item: {amount: number; category: string}) => {
          const amt = Number(item.amount) || 0
          return (item.category === 'Cash' || item.category === 'Receivables') ? sum + amt : sum - amt
        }, 0)
        setNetCapital(nc)
        setLoading(false)
      })
      .catch(e => { setErr(e.message); setLoading(false) })
  }, [])

  if (loading) return <Center>Laden…</Center>
  if (err) return <Center red>Fehler beim Laden der Daten ({err})</Center>

  const months = data?.months ?? []

  if (!months.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-[#6B7280]">Noch keine Daten – starte mit der Konfiguration.</p>
        <Link href="/setup" className="btn-primary">Zu den Einstellungen →</Link>
      </div>
    )
  }

  const finalBalance = months[months.length - 1].cumulative
  const minBalance = Math.min(...months.map(m => m.cumulative))
  const minMonth = months.find(m => m.cumulative === minBalance)
  const negativeMonth = months.find(m => m.cumulative < 0)
  const avgResult = months.reduce((s, m) => s + m.result, 0) / months.length

  const chartData = [
    { label: 'Start', cumulative: netCapital },
    ...months.map(m => ({ label: m.label, cumulative: m.cumulative })),
  ]

  const isPositiveTrend = finalBalance >= netCapital

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto space-y-5">

      {/* Alert if going negative */}
      {negativeMonth && (
        <div className="flex items-center gap-3 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm text-[#DC2626]">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span>Kumulierter Stand wird negativ ab <strong>{negativeMonth.label}</strong></span>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Netto-Kapital"
          value={netCapital}
          sub="Aktueller Vermögensstand"
          icon={<IconWallet />}
          large
        />
        <KpiCard
          label="Ø Monatsergebnis"
          value={avgResult}
          sub="Einnahmen − Ausgaben"
          icon={<IconTrend positive={avgResult >= 0} />}
        />
        <KpiCard
          label="Tiefpunkt"
          value={minBalance}
          sub={minMonth?.label}
          icon={<IconDown />}
        />
        <KpiCard
          label="Endstand"
          value={finalBalance}
          sub={`nach ${months.length} Monaten`}
          icon={<IconFlag positive={isPositiveTrend} />}
        />
      </div>

      {/* Chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-[#111827]">Vermögensentwicklung</h2>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isPositiveTrend ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>
            {isPositiveTrend ? '+' : ''}€ {fmt(finalBalance - netCapital)} über {months.length} Monate
          </span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
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
              formatter={(v: number) => [`€ ${fmt(v)}`, 'Kontostand']}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)',
              }}
            />
            <ReferenceLine y={0} stroke="#FCA5A5" strokeDasharray="4 2" />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="#3B82F6"
              strokeWidth={2.5}
              fill="url(#gradPos)"
              dot={false}
              activeDot={{ r: 4, fill: '#1d4ed8', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick nav cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            href: '/capital',
            label: 'Kapitalübersicht',
            desc: 'Cash, Receivables, Payables, Provisions',
            icon: <IconCapital />,
          },
          {
            href: '/planning',
            label: 'Ausgabenplanung',
            desc: 'Monatliche Einnahmen & Ausgaben',
            icon: <IconPlanning />,
          },
          {
            href: '/setup',
            label: 'Einstellungen',
            desc: 'Einnahmearten, Kategorien, Internships',
            icon: <IconSettings />,
          },
        ].map(l => (
          <Link
            key={l.href}
            href={l.href}
            className="card p-4 hover:border-[#3B82F6] hover:shadow-md transition-all group flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0 group-hover:bg-[#DBEAFE] transition-colors">
              {l.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#111827] group-hover:text-[#1E3A8A] transition-colors">
                {l.label}
              </p>
              <p className="text-xs text-[#6B7280] mt-0.5">{l.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  large,
  icon,
}: {
  label: string
  value: number
  sub?: string
  large?: boolean
  icon?: React.ReactNode
}) {
  const positive = value >= 0
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="section-label">{label}</p>
        {icon && (
          <div className="w-7 h-7 rounded-md bg-[#F3F4F6] flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
      </div>
      <p className={`font-bold num tabular-nums ${large ? 'text-3xl' : 'text-2xl'} ${positive ? 'pos' : 'neg'}`}>
        {value < 0 ? '–' : ''}€ {fmt(Math.abs(value))}
      </p>
      {sub && <p className="text-xs text-[#9CA3AF] mt-1">{sub}</p>}
    </div>
  )
}

function IconWallet() {
  return (
    <svg className="w-4 h-4 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-2M16 12a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

function IconTrend({ positive }: { positive: boolean }) {
  return positive ? (
    <svg className="w-4 h-4 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-[#DC2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 7L7 17M7 17h10M7 17V7" />
    </svg>
  )
}

function IconDown() {
  return (
    <svg className="w-4 h-4 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0l-4-4m4 4l4-4" />
    </svg>
  )
}

function IconFlag({ positive }: { positive: boolean }) {
  return (
    <svg className="w-4 h-4" style={{ color: positive ? '#059669' : '#DC2626' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18M3 6l9-3 9 3-9 3-9-3z" />
    </svg>
  )
}

function IconCapital() {
  return (
    <svg className="w-4 h-4 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  )
}

function IconPlanning() {
  return (
    <svg className="w-4 h-4 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg className="w-4 h-4 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function Center({ children, red }: { children: React.ReactNode; red?: boolean }) {
  return (
    <div className={`flex h-64 items-center justify-center text-sm ${red ? 'text-[#DC2626]' : 'text-[#9CA3AF]'}`}>
      {children}
    </div>
  )
}
