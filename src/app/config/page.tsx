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
        // Convert month input "YYYY-MM" to "YYYY-MM-01"
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
        <h1 className="text-xl font-bold text-[#1A1A1A] mb-6">Config</h1>
        <div className="max-w-lg space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-10 bg-[#F8F8F8] animate-pulse border border-[#E5E5E5]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-xl font-bold text-[#1A1A1A] mb-6">Config</h1>

      <form onSubmit={handleSave} className="max-w-lg space-y-5">
        <fieldset className="border border-[#E5E5E5] p-4">
          <legend className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-1">
            Monthly Expenses
          </legend>
          <div className="space-y-4 mt-2">
            <FormRow
              label="Rent"
              hint="€/month"
              value={form.rent}
              onChange={v => handleChange('rent', v)}
              type="number"
            />
            <FormRow
              label="Food"
              hint="€/day"
              value={form.food_per_day}
              onChange={v => handleChange('food_per_day', v)}
              type="number"
            />
            <FormRow
              label="Fun"
              hint="€/day"
              value={form.fun_per_day}
              onChange={v => handleChange('fun_per_day', v)}
              type="number"
            />
            <FormRow
              label="Other Monthly"
              hint="€/month"
              value={form.other_monthly}
              onChange={v => handleChange('other_monthly', v)}
              type="number"
            />
          </div>
        </fieldset>

        <fieldset className="border border-[#E5E5E5] p-4">
          <legend className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-1">
            Insurance
          </legend>
          <div className="space-y-4 mt-2">
            <FormRow
              label="Insurance Amount"
              hint="€/month"
              value={form.insurance}
              onChange={v => handleChange('insurance', v)}
              type="number"
            />
            <div className="flex items-center gap-3">
              <label className="text-sm text-[#1A1A1A] w-36">Insurance Active</label>
              <button
                type="button"
                onClick={() =>
                  handleChange('insurance_active', form.insurance_active === 'true' ? 'false' : 'true')
                }
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  form.insurance_active === 'true' ? 'bg-[#C9A84C]' : 'bg-[#E5E5E5]'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${
                    form.insurance_active === 'true' ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-500">
                {form.insurance_active === 'true' ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </fieldset>

        <fieldset className="border border-[#E5E5E5] p-4">
          <legend className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-1">
            Travel
          </legend>
          <FormRow
            label="Flight Price"
            hint="€/flight"
            value={form.flight_price}
            onChange={v => handleChange('flight_price', v)}
            type="number"
          />
        </fieldset>

        <fieldset className="border border-[#E5E5E5] p-4">
          <legend className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-1">
            Family Support
          </legend>
          <div className="space-y-4 mt-2">
            <FormRow
              label="Support Papa"
              hint="€/month"
              value={form.support_papa}
              onChange={v => handleChange('support_papa', v)}
              type="number"
            />
            <FormRow
              label="Support Mama"
              hint="€/month"
              value={form.support_mama}
              onChange={v => handleChange('support_mama', v)}
              type="number"
            />
          </div>
        </fieldset>

        <fieldset className="border border-[#E5E5E5] p-4">
          <legend className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-1">
            Planning Horizon
          </legend>
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-3">
              <label className="text-sm text-[#1A1A1A] w-36">Start Month</label>
              <input
                type="month"
                value={form.start_month}
                onChange={e => handleChange('start_month', e.target.value)}
                className="border border-[#E5E5E5] px-2 py-1.5 text-sm outline-none focus:border-[#C9A84C]"
              />
            </div>
            <FormRow
              label="Number of Months"
              hint=""
              value={form.num_months}
              onChange={v => handleChange('num_months', v)}
              type="number"
            />
          </div>
        </fieldset>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#C9A84C] text-white px-5 py-2 text-sm font-medium hover:bg-[#b8953f] transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Config'}
          </button>
          {saved && (
            <span className="text-green-700 text-sm font-medium">Saved successfully</span>
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
    <div className="flex items-center gap-3">
      <label className="text-sm text-[#1A1A1A] w-36 shrink-0">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="border border-[#E5E5E5] px-2 py-1.5 text-sm w-28 outline-none focus:border-[#C9A84C]"
        />
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
    </div>
  )
}
