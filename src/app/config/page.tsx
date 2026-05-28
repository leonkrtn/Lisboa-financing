'use client'
import { useEffect, useState } from 'react'

interface ConfigForm {
  rent: string
  food_per_day: string
  fun_per_day: string
  insurance: string
  insurance_active: string
  flight_price: string
  other_monthly: string
  support_papa: string
  support_mama: string
  start_month: string
  num_months: string
  savings_goal: string
}

const defaultForm: ConfigForm = {
  rent: '',
  food_per_day: '',
  fun_per_day: '',
  insurance: '',
  insurance_active: 'false',
  flight_price: '',
  other_monthly: '',
  support_papa: '',
  support_mama: '',
  start_month: '',
  num_months: '24',
  savings_goal: '0',
}

export default function ConfigPage() {
  const [form, setForm] = useState<ConfigForm>(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(data => {
        setForm({
          rent: data.rent ?? '',
          food_per_day: data.food_per_day ?? '',
          fun_per_day: data.fun_per_day ?? '',
          insurance: data.insurance ?? '',
          insurance_active: data.insurance_active ?? 'false',
          flight_price: data.flight_price ?? '',
          other_monthly: data.other_monthly ?? '',
          support_papa: data.support_papa ?? '',
          support_mama: data.support_mama ?? '',
          start_month: data.start_month ? data.start_month.slice(0, 7) : '',
          num_months: data.num_months ?? '24',
          savings_goal: data.savings_goal ?? '0',
        })
      })
      .catch(() => setError('Failed to load config'))
      .finally(() => setLoading(false))
  }, [])

  function handleChange(key: keyof ConfigForm, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload: Record<string, string> = {
        ...form,
        start_month: form.start_month ? form.start_month + '-01' : '',
      }
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save config')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Config</h1>
        <div className="max-w-2xl space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="card h-28 animate-pulse bg-[#F1F5F9]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Config</h1>

      <form onSubmit={handleSave} className="max-w-2xl space-y-5">
        {/* Monthly Expenses */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-[#1E3A8A] border-b border-[#E2E8F0]">
            <span className="text-xs font-semibold uppercase tracking-wide text-white">Monthly Expenses</span>
          </div>
          <div className="p-5 space-y-4">
            <FormRow label="Rent" hint="€/month" value={form.rent} onChange={v => handleChange('rent', v)} type="number" />
            <FormRow label="Food" hint="€/day" value={form.food_per_day} onChange={v => handleChange('food_per_day', v)} type="number" />
            <FormRow label="Fun" hint="€/day" value={form.fun_per_day} onChange={v => handleChange('fun_per_day', v)} type="number" />
            <FormRow label="Other Monthly" hint="€/month" value={form.other_monthly} onChange={v => handleChange('other_monthly', v)} type="number" />
          </div>
        </div>

        {/* Insurance */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-[#1E3A8A] border-b border-[#E2E8F0]">
            <span className="text-xs font-semibold uppercase tracking-wide text-white">Insurance</span>
          </div>
          <div className="p-5 space-y-4">
            <FormRow label="Insurance Amount" hint="€/month" value={form.insurance} onChange={v => handleChange('insurance', v)} type="number" />
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-[#0F172A] w-40 shrink-0">Insurance Active</label>
              <button
                type="button"
                onClick={() => handleChange('insurance_active', form.insurance_active === 'true' ? 'false' : 'true')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#60A5FA] ${
                  form.insurance_active === 'true' ? 'bg-[#1E3A8A]' : 'bg-[#E2E8F0]'
                }`}
                role="switch"
                aria-checked={form.insurance_active === 'true'}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    form.insurance_active === 'true' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm text-[#64748B]">
                {form.insurance_active === 'true' ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Travel */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-[#1E3A8A] border-b border-[#E2E8F0]">
            <span className="text-xs font-semibold uppercase tracking-wide text-white">Travel</span>
          </div>
          <div className="p-5">
            <FormRow label="Flight Price" hint="€/flight" value={form.flight_price} onChange={v => handleChange('flight_price', v)} type="number" />
          </div>
        </div>

        {/* Family Support */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-[#1E3A8A] border-b border-[#E2E8F0]">
            <span className="text-xs font-semibold uppercase tracking-wide text-white">Family Support</span>
          </div>
          <div className="p-5 space-y-4">
            <FormRow label="Support Papa" hint="€/month" value={form.support_papa} onChange={v => handleChange('support_papa', v)} type="number" />
            <FormRow label="Support Mama" hint="€/month" value={form.support_mama} onChange={v => handleChange('support_mama', v)} type="number" />
          </div>
        </div>

        {/* Planning Horizon */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-[#1E3A8A] border-b border-[#E2E8F0]">
            <span className="text-xs font-semibold uppercase tracking-wide text-white">Planning Horizon</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-[#0F172A] w-40 shrink-0">Start Month</label>
              <input
                type="month"
                value={form.start_month}
                onChange={e => handleChange('start_month', e.target.value)}
                className="input max-w-[200px]"
              />
            </div>
            <FormRow label="Number of Months" hint="" value={form.num_months} onChange={v => handleChange('num_months', v)} type="number" />
            <FormRow label="Savings Goal" hint="€" value={form.savings_goal} onChange={v => handleChange('savings_goal', v)} type="number" />
          </div>
        </div>

        {error && (
          <div className="text-[#DC2626] text-sm bg-[#FEF2F2] border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#1E3A8A] text-white hover:bg-[#172554] rounded-lg px-5 py-2 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Config'}
          </button>
          {saved && (
            <span className="text-[#16A34A] text-sm font-medium">Saved successfully</span>
          )}
        </div>
      </form>
    </div>
  )
}

interface FormRowProps {
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
  type?: string
}

function FormRow({ label, hint, value, onChange, type = 'text' }: FormRowProps) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-sm font-medium text-[#0F172A] w-40 shrink-0">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="input max-w-[160px]"
        />
        {hint && <span className="text-xs text-[#64748B] shrink-0">{hint}</span>}
      </div>
    </div>
  )
}
