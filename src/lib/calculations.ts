import type { Config, IncomeType, Month, Internship, BalanceItem, CalculatedMonth } from '@/types'

// Helper: days in a month given a date string "YYYY-MM-DD"
export function getDaysInMonth(dateStr: string): number {
  const d = new Date(dateStr)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

// Helper: find internship that overlaps with the given month
export function getInternshipForMonth(monthDateStr: string, internships: Internship[]): Internship | null {
  const monthStart = new Date(monthDateStr)
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)

  for (const intern of internships) {
    const internStart = new Date(intern.start_date)
    const internEnd = new Date(intern.end_date)
    if (internStart <= monthEnd && internEnd >= monthStart) {
      return intern
    }
  }
  return null
}

// Helper: calculate prorata ratio for internship in a month
export function getInternshipRatio(monthDateStr: string, internship: Internship): number {
  const monthStart = new Date(monthDateStr)
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)

  const internStart = new Date(internship.start_date)
  const internEnd = new Date(internship.end_date)

  const overlapStart = internStart > monthStart ? internStart : monthStart
  const overlapEnd = internEnd < monthEnd ? internEnd : monthEnd

  const daysOverlap = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1
  const daysInMonth = monthEnd.getDate()
  return Math.min(daysOverlap / daysInMonth, 1)
}

// Generate array of month date strings (YYYY-MM-DD) from startDate, count months
export function generateMonthDates(startDateStr: string, count: number): string[] {
  const result: string[] = []
  const start = new Date(startDateStr)
  for (let i = 0; i < count; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    result.push(`${y}-${m}-01`)
  }
  return result
}

// Format a date string to "Jan 2025"
export function formatMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// Main calculation function
export function calculateMonths(
  config: Config,
  dbMonths: Month[],
  internships: Internship[],
  incomeTypes: IncomeType[],
  balanceItems: BalanceItem[]
): CalculatedMonth[] {
  const startMonth = config.start_month || new Date().toISOString().slice(0, 7) + '-01'
  const numMonths = parseInt(config.num_months || '24', 10)
  const monthDates = generateMonthDates(startMonth, numMonths)

  // Build lookup maps
  const dbMonthMap = new Map<string, Month>()
  for (const m of dbMonths) {
    dbMonthMap.set(m.month_date, m)
  }
  const incomeTypeMap = new Map<string, IncomeType>()
  for (const it of incomeTypes) {
    incomeTypeMap.set(it.id, it)
  }

  // Calculate initial savings from balance items
  let initialSavings = 0
  for (const item of balanceItems) {
    let amount = item.amount
    if (item.internship_id) {
      const intern = internships.find(i => i.id === item.internship_id)
      if (intern) {
        const start = new Date(intern.start_date)
        const end = new Date(intern.end_date)
        const durationMonths =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth()) +
          1
        amount = intern.net_salary * durationMonths
      }
    }
    if (item.direction === '+') initialSavings += amount
    else initialSavings -= amount
  }

  const results: CalculatedMonth[] = []
  let runningSavings = initialSavings

  for (const monthDate of monthDates) {
    const dbMonth = dbMonthMap.get(monthDate)
    const daysInMonth = getDaysInMonth(monthDate)
    const internship = getInternshipForMonth(monthDate, internships)
    const incomeTypeId = dbMonth?.income_type_id ?? null
    const incomeType = incomeTypeId ? (incomeTypeMap.get(incomeTypeId) ?? null) : null

    // Salary
    let salary = 0
    if (dbMonth?.manual_salary != null) {
      salary = dbMonth.manual_salary
    } else if (internship) {
      const ratio = getInternshipRatio(monthDate, internship)
      salary = internship.net_salary * ratio
    } else if (incomeType) {
      salary = incomeType.hours_per_week * incomeType.salary_per_hour * (1 - incomeType.tax_rate) * 4.34
    }

    // Costs
    let support = 0, rent = 0, food = 0, fun = 0, gymTransport = 0
    if (internship) {
      support = internship.support_papa + internship.support_mama
      rent = internship.rent
      food = internship.food
      fun = internship.fun
      gymTransport = internship.gym + internship.transport
    } else {
      support = parseFloat(config.support_papa || '0') + parseFloat(config.support_mama || '0')
      rent = parseFloat(config.rent || '0')
      food = parseFloat(config.food_per_day || '0') * daysInMonth
      fun = parseFloat(config.fun_per_day || '0') * daysInMonth
      gymTransport = 0
    }

    const insurance = config.insurance_active === 'true' ? parseFloat(config.insurance || '0') : 0
    const hasFlightFlag = dbMonth?.has_flight ?? false
    const flights = hasFlightFlag ? parseFloat(config.flight_price || '0') : 0
    const other = internship ? 0 : parseFloat(config.other_monthly || '0')
    const tuition = dbMonth?.tuition_fee ?? 0
    const annualFee = dbMonth?.annual_fee ?? 0
    const adjustment = dbMonth?.adjustment ?? 0

    const result =
      salary +
      support -
      rent -
      food -
      fun -
      (internship ? gymTransport : 0) -
      insurance -
      flights -
      other -
      tuition -
      annualFee -
      adjustment

    runningSavings += result

    results.push({
      month_date: monthDate,
      label: formatMonthLabel(monthDate),
      month_id: dbMonth?.id ?? null,
      income_type_id: incomeTypeId,
      manual_salary: dbMonth?.manual_salary ?? null,
      has_flight: hasFlightFlag,
      tuition_fee: tuition,
      annual_fee: annualFee,
      adjustment,
      salary,
      support,
      rent,
      food,
      fun,
      gym_transport: gymTransport,
      insurance,
      flights,
      other: internship ? gymTransport : other,
      result,
      savings: runningSavings,
      internship: internship ?? null,
      income_type: incomeType,
    })
  }

  return results
}

export function fmt(n: number): string {
  return new Intl.NumberFormat('en-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}
