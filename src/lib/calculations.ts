import type {
  Config,
  IncomeType,
  ExpenseCategory,
  CapitalItem,
  Internship,
  InternshipExpenseOverride,
  MonthData,
  MonthExpenseOverride,
  CalculatedMonth,
} from '@/types'

const WEEKS_PER_MONTH = 52 / 12

// Supabase returns NUMERIC columns as strings to preserve precision.
// This helper safely coerces any value to a finite number.
function n(v: unknown): number {
  const x = Number(v)
  return isFinite(x) ? x : 0
}

// Timezone-safe: avoids UTC-midnight shifting in western timezones
function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function getDaysInMonth(dateStr: string): number {
  const [y, m] = dateStr.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function generateMonthDates(startDateStr: string, count: number): string[] {
  const [y, mo] = startDateStr.split('-').map(Number)
  const result: string[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(y, mo - 1 + i, 1)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    result.push(`${year}-${month}-01`)
  }
  return result
}

export function formatMonthLabel(dateStr: string): string {
  const d = parseDate(dateStr)
  return d.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })
}

function getInternshipForMonth(monthDateStr: string, internships: Internship[]): Internship | null {
  const monthStart = parseDate(monthDateStr)
  const [y, m] = monthDateStr.split('-').map(Number)
  const monthEnd = new Date(y, m, 0)
  for (const intern of internships) {
    const start = parseDate(intern.start_date)
    const end = parseDate(intern.end_date)
    if (start <= monthEnd && end >= monthStart) return intern
  }
  return null
}

function getInternshipRatio(monthDateStr: string, internship: Internship): number {
  const monthStart = parseDate(monthDateStr)
  const [y, m] = monthDateStr.split('-').map(Number)
  const monthEnd = new Date(y, m, 0)
  const daysInMonth = monthEnd.getDate()
  const start = parseDate(internship.start_date)
  const end = parseDate(internship.end_date)
  const overlapStart = start > monthStart ? start : monthStart
  const overlapEnd = end < monthEnd ? end : monthEnd
  const daysOverlap = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1
  return Math.min(Math.max(daysOverlap / daysInMonth, 0), 1)
}

export function computeIncomeForType(incomeType: IncomeType): number {
  if (incomeType.type === 'manual') return n(incomeType.manual_amount)
  return n(incomeType.hours_per_week) * n(incomeType.salary_per_hour) * (1 - n(incomeType.tax_rate)) * WEEKS_PER_MONTH
}

function computeInternshipIncome(internship: Internship): number {
  if (internship.income_mode === 'hourly') {
    return n(internship.hours_per_week) * n(internship.salary_per_hour) * (1 - n(internship.tax_rate)) * WEEKS_PER_MONTH
  }
  return n(internship.manual_salary)
}

// overrideAmount replaces default_amount for monthly/daily types.
// once/yearly always use default_amount (no internship override applies).
function computeExpenseAmount(
  category: ExpenseCategory,
  monthDateStr: string,
  daysInMonth: number,
  overrideAmount?: number
): number {
  const base = overrideAmount !== undefined ? n(overrideAmount) : n(category.default_amount)
  // Respect start_month: monthly/daily don't apply before the configured start
  if (
    category.start_month &&
    (category.type === 'monthly' || category.type === 'daily') &&
    monthDateStr.slice(0, 7) < category.start_month.slice(0, 7)
  ) return 0

  switch (category.type) {
    case 'monthly':
      return base
    case 'daily':
      return base * daysInMonth
    case 'once':
      if (!category.once_month) return 0
      return category.once_month.slice(0, 7) === monthDateStr.slice(0, 7) ? n(category.default_amount) : 0
    case 'yearly': {
      if (!category.yearly_month) return 0
      const monthNum = parseInt(monthDateStr.split('-')[1], 10)
      return monthNum === n(category.yearly_month) ? n(category.default_amount) : 0
    }
    default:
      return 0
  }
}

export function calculateNetCapital(capitalItems: CapitalItem[]): number {
  return capitalItems.reduce((sum, item) => {
    const amount = n(item.amount)
    if (item.category === 'Cash' || item.category === 'Receivables') return sum + amount
    return sum - amount
  }, 0)
}

export function calculateMonths(
  config: Config,
  monthDataList: MonthData[],
  internships: Internship[],
  incomeTypes: IncomeType[],
  expenseCategories: ExpenseCategory[],
  internshipOverrides: InternshipExpenseOverride[],
  capitalItems: CapitalItem[],
  monthExpenseOverrides: MonthExpenseOverride[] = []
): CalculatedMonth[] {
  const startMonth = config.start_month || new Date().toISOString().slice(0, 7) + '-01'
  const numMonths = parseInt(config.num_months || '24', 10)
  const monthDates = generateMonthDates(startMonth, numMonths)

  const monthDataMap = new Map<string, MonthData>()
  for (const md of monthDataList) monthDataMap.set(md.month_date, md)

  const incomeTypeMap = new Map<string, IncomeType>()
  for (const it of incomeTypes) incomeTypeMap.set(it.id, it)

  // overrideKey = "internship_id:category_id"
  const overrideMap = new Map<string, number>()
  for (const o of internshipOverrides) {
    overrideMap.set(`${o.internship_id}:${o.expense_category_id}`, n(o.amount))
  }

  // Per-month expense overrides: "YYYY-MM-01:category_id" → amount
  const monthExpMap = new Map<string, number>()
  for (const o of monthExpenseOverrides) {
    monthExpMap.set(`${o.month_date}:${o.expense_category_id}`, n(o.amount))
  }

  const netCapital = calculateNetCapital(capitalItems)
  const results: CalculatedMonth[] = []
  let cumulative = netCapital

  for (const monthDate of monthDates) {
    const md = monthDataMap.get(monthDate) ?? null
    const daysInMonth = getDaysInMonth(monthDate)
    const internship = getInternshipForMonth(monthDate, internships)
    const ratio = internship ? getInternshipRatio(monthDate, internship) : 0

    // ── Income ──────────────────────────────────────────────────────────────
    // Priority: manual_salary (month_data) > internship > income_type > 0
    let income = 0
    let incomeLabel = '–'
    let resolvedIncomeType: IncomeType | null = null
    const hasManualSalary = md?.manual_salary != null

    if (hasManualSalary) {
      income = md!.manual_salary!
      incomeLabel = 'Manuell'
    } else if (internship && ratio > 0) {
      const fullInternIncome = computeInternshipIncome(internship)
      income = fullInternIncome * ratio
      incomeLabel = internship.name
      // Blend in normal income for non-internship portion of partial months
      if (ratio < 1 && md?.income_type_id) {
        const it = incomeTypeMap.get(md.income_type_id)
        if (it) income += computeIncomeForType(it) * (1 - ratio)
      }
    } else if (md?.income_type_id) {
      resolvedIncomeType = incomeTypeMap.get(md.income_type_id) ?? null
      if (resolvedIncomeType) {
        income = computeIncomeForType(resolvedIncomeType)
        incomeLabel = resolvedIncomeType.name
      }
    }

    // ── Expenses ─────────────────────────────────────────────────────────────
    // For monthly/daily: blend internship override with normal for partial months.
    // For once/yearly: no internship override; use category default as-is.
    // When manual_salary is set, we still apply internship expense overrides
    // (the user is in that location/period regardless of how income is entered).
    const expenses = expenseCategories.map(cat => {
      let amount = 0
      const monthKey = `${monthDate}:${cat.id}`
      const hasMontOverride = monthExpMap.has(monthKey)

      if (hasMontOverride) {
        // Per-month override has highest priority
        amount = monthExpMap.get(monthKey)!
      } else if (cat.type === 'once' || cat.type === 'yearly') {
        amount = computeExpenseAmount(cat, monthDate, daysInMonth)
      } else if (internship && ratio > 0) {
        const overrideKey = `${internship.id}:${cat.id}`
        const hasOverride = overrideMap.has(overrideKey)
        const overrideAmt = hasOverride ? overrideMap.get(overrideKey)! : undefined

        if (ratio >= 1) {
          amount = computeExpenseAmount(cat, monthDate, daysInMonth, overrideAmt)
        } else {
          const internAmt = computeExpenseAmount(cat, monthDate, daysInMonth, overrideAmt) * ratio
          const normalAmt = computeExpenseAmount(cat, monthDate, daysInMonth) * (1 - ratio)
          amount = internAmt + normalAmt
        }
      } else {
        amount = computeExpenseAmount(cat, monthDate, daysInMonth)
      }

      return {
        category_id: cat.id,
        name: cat.name,
        amount: isFinite(amount) ? amount : 0,
        is_override: hasMontOverride,
      }
    })

    const safeIncome = isFinite(income) ? income : 0
    const total_expenses = expenses.reduce((s, e) => s + e.amount, 0)
    const result = safeIncome - total_expenses
    cumulative += result

    results.push({
      month_date: monthDate,
      label: formatMonthLabel(monthDate),
      income: safeIncome,
      income_label: incomeLabel,
      expenses,
      total_expenses,
      result,
      cumulative,
      internship: internship ?? null,
      income_type: resolvedIncomeType,
      month_data: md,
    })
  }

  return results
}

export function fmt(n: number): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function fmtShort(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1000) {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n)
  }
  return fmt(n)
}
