'use client'
import {
  ResponsiveContainer,
  LineChart,
  Line,
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
  return new Intl.NumberFormat('en-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + ' €'
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
    <div className="bg-white border border-[#E5E5E5] px-3 py-2 text-sm shadow-sm">
      <div className="font-semibold mb-1 text-[#1A1A1A]">{label}</div>
      {payload.map(entry => (
        <div key={entry.name} style={{ color: entry.color }} className="flex gap-2 justify-between">
          <span>{entry.name}:</span>
          <span className="font-medium">{formatEur(entry.value)}</span>
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
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#6B7280' }}
          tickLine={false}
          axisLine={{ stroke: '#E5E5E5' }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={tickFormatter}
          tick={{ fontSize: 11, fill: '#6B7280' }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          iconType="line"
        />
        <Line
          type="monotone"
          dataKey="savings"
          name="Savings"
          stroke="#1A1A1A"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="result"
          name="Result"
          stroke="#C9A84C"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
