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
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch('/api/calculated')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setErr(e.message); setLoading(false) })
  }, [])

  if (loading) return <Center>Laden…</Center>
  if (err) return <Center red>Fehler: {err}</Center>

  const months = data?.months ?? []
  const netCapital = data?.net_capital ?? 0

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
  const negativeMonth = months.find(m => m.cumulative < 0)
  const avgResult = months.reduce((s, m) => s + m.result, 0) / months.length

  // Chart data: prepend the starting net capital as "Start" point
  const chartData = [
    { label: 'Start', cumulative: netCapital },
    ...months.map(m => ({ label: m.label, cumulative: m.cumulative })),
  ]

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto space-y-5">

      {/* Top KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Netto-Kapital"
          value={netCapital}
          sub="Aktueller Vermögensstand"
          large
        />
        <KpiCard
          label="Ø Monatsergebnis"
          value={avgResult}
          sub="Einnahmen − Ausgaben"
        />
        <KpiCard
          label="Tiefpunkt"
          value={minBalance}
          sub={minBalance === netCapital ? 'Gleichbleibend' : undefined}
        />
        <KpiCard
          label="Endstand"
          value={finalBalance}
          sub={`nach ${months.length} Monaten`}
        />
      </div>

      {/* Alert if going negative */}
      {negativeMonth && (
        <div className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm text-[#DC2626]">
          ⚠ Kontostand wird negativ ab <strong>{negativeMonth.label}</strong>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-5">
        <h2 className="text-sm font-semibold mb-4 text-[#111827]">Vermögensentwicklung</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
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
              formatter={(v: number) => [`€ ${fmt(v)}`, 'Kontostand']}
              contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #E5E7EB', boxShadow: 'none' }}
            />
            <ReferenceLine y={0} stroke="#FCA5A5" strokeDasharray="4 2" />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#grad)"
              dot={false}
              activeDot={{ r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { href: '/capital', label: 'Kapitalplanung', desc: 'Cash, Receivables, Payables, Provisions' },
          { href: '/planning', label: 'Ausgabenplanung', desc: 'Monatliche Einnahmen & Ausgaben' },
          { href: '/setup', label: 'Einstellungen', desc: 'Einnahmearten, Kategorien, Internships' },
        ].map(l => (
          <Link
            key={l.href}
            href={l.href}
            className="bg-white rounded-lg border border-[#E5E7EB] p-4 hover:border-[#3B82F6] hover:shadow-sm transition-all group"
          >
            <p className="text-sm font-semibold text-[#111827] group-hover:text-[#1E3A8A]">{l.label} →</p>
            <p className="text-xs text-[#6B7280] mt-0.5">{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, large }: { label: string; value: number; sub?: string; large?: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1">{label}</p>
      <p className={`font-bold num ${large ? 'text-3xl' : 'text-2xl'} ${value >= 0 ? 'pos' : 'neg'}`}>
        {value < 0 ? '–' : ''}€ {fmt(Math.abs(value))}
      </p>
      {sub && <p className="text-xs text-[#9CA3AF] mt-0.5">{sub}</p>}
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
