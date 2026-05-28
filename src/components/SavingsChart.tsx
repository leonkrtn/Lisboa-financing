'use client'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'

interface SavingsChartProps {
  data: { label: string; savings: number; result: number }[]
}

function formatEur(value: number) {
  return (
    '€ ' +
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  )
}

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-white border border-[#E2E8F0] px-4 py-3 text-sm shadow-lg rounded-lg">
      <div className="font-semibold mb-2 text-[#0F172A]">{label}</div>
      {payload.map(entry => (
        <div key={entry.name} className="flex gap-3 justify-between items-center mb-1">
          <span style={{ color: entry.color }} className="font-medium">
            {entry.name}
          </span>
          <span className="font-semibold text-[#0F172A]">{formatEur(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

function tickFormatter(value: number) {
  if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(0) + 'k'
  }
  return String(value)
}

export default function SavingsChart({ data }: SavingsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E3A8A" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#1E3A8A" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="resultGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />

        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#64748B' }}
          tickLine={false}
          axisLine={{ stroke: '#E2E8F0' }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={tickFormatter}
          tick={{ fontSize: 11, fill: '#64748B' }}
          tickLine={false}
          axisLine={false}
          width={52}
        />

        <Tooltip content={<CustomTooltip />} />

        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          iconType="plainline"
        />

        <Area
          type="monotone"
          dataKey="savings"
          name="Savings"
          stroke="#1E3A8A"
          strokeWidth={2}
          fill="url(#savingsGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#1E3A8A' }}
        />
        <Area
          type="monotone"
          dataKey="result"
          name="Result"
          stroke="#60A5FA"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          fill="url(#resultGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#60A5FA' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
