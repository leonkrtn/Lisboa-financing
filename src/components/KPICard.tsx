import React from 'react'

interface KPICardProps {
  label: string
  value: string
  sub?: string
  trend?: 'up' | 'down' | null
  color?: 'blue' | 'green' | 'red' | 'neutral'
  icon: React.ReactNode
}

const borderColors = {
  blue: 'border-l-[#1E3A8A]',
  green: 'border-l-[#16A34A]',
  red: 'border-l-[#DC2626]',
  neutral: 'border-l-[#1E3A8A]',
}

const iconBgColors = {
  blue: 'bg-[#EFF6FF]',
  green: 'bg-[#F0FDF4]',
  red: 'bg-[#FEF2F2]',
  neutral: 'bg-[#EFF6FF]',
}

const iconTextColors = {
  blue: 'text-[#1E3A8A]',
  green: 'text-[#16A34A]',
  red: 'text-[#DC2626]',
  neutral: 'text-[#1E3A8A]',
}

export default function KPICard({
  label,
  value,
  sub,
  trend = null,
  color = 'neutral',
  icon,
}: KPICardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 min-w-[200px] flex flex-col gap-3 border-l-4 ${borderColors[color]}`}
    >
      {/* Icon */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBgColors[color]} ${iconTextColors[color]}`}
      >
        {icon}
      </div>

      {/* Label */}
      <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
        {label}
      </div>

      {/* Value */}
      <div className="text-2xl font-bold text-[#0F172A] leading-none">
        {value}
      </div>

      {/* Trend + sub */}
      {(trend || sub) && (
        <div className="flex items-center gap-1.5 text-xs">
          {trend === 'up' && (
            <span className="text-[#16A34A] font-bold">▲</span>
          )}
          {trend === 'down' && (
            <span className="text-[#DC2626] font-bold">▼</span>
          )}
          {sub && <span className="text-[#64748B]">{sub}</span>}
        </div>
      )}
    </div>
  )
}
