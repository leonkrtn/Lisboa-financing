interface KPICardProps {
  label: string
  value: string
  sub?: string
  positive?: boolean | null
}

export default function KPICard({ label, value, sub, positive }: KPICardProps) {
  return (
    <div className="border border-[#E5E5E5] bg-white p-5 min-w-[160px]">
      <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">{label}</div>
      <div
        className={`text-2xl font-semibold ${
          positive === true
            ? 'text-green-700'
            : positive === false
            ? 'text-red-700'
            : 'text-[#1A1A1A]'
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}
