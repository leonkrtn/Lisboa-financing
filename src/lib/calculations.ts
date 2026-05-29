import type { Config, IncomeType, Month, Internship, BalanceItem, CalculatedMonth } from '@/types'

// Timezone-safe date parser — avoids UTC-midnight shifting to previous day in western timezones
function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function getDaysInMonth(dateStr: string): number {
  const [y, m] = dateStr.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function getInternshipForMonth(monthDateStr: string, internships: Internship[]): Internship | null {
  const monthStart = parseDate(monthDateStr)
  const [y, m] = monthDateStr.split('-').map(Number)
  const monthEnd = new Date(y, m, 0)

  for (const intern of internships) {
    const internStart = parseDate(intern.start_date)
    const internEnd = parseDate(intern.end_date)
    if (internStart <= monthEnd && internEnd >= monthStart) {
      return intern
    }
  }
  return null
}

export function getInternshipRatio(monthDateStr: string, internship: Internship): number {
  const monthStart = parseDate(monthDateStr)
  const [y, m] = monthDateStr.split('-').map(Number)
  const monthEnd = new Date(y, m, 0)
  const daysInMonth = monthEnd.getDate()

  const internStart = parseDate(internship.start_date)
  const internEnd = parseDate(internship.end_date)

  const overlapStart = internStart > monthStart ? internStart : monthStart
  const overlapEnd = internEnd < monthEnd ? internEnd : monthEnd

  const daysOverlap = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1
  return Math.min(daysOverlap / daysInMonth, 1)
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
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

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

  const dbMonthMap = new Map<string, Month>()
  for (const mo of dbMonths) {
    dbMonthMap.set(mo.month_date, mo)
  }
  const incomeTypeMap = new Map<string, IncomeType>()
  for (const it of incomeTypes) {
    incomeTypeMap.set(it.id, it)
  }

  // Initial savings from balance items
  let initialSavings = 0
  for (const item of balanceItems) {
    let amount = item.amount
    if (item.internship_id) {
      const intern = internships.find(i => i.id === item.internship_id)
      if (intern) {
        const start = parseDate(intern.start_date)
        const end = parseDate(intern.end_date)
        const durationMonths =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth()) + 1
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
      salary = internship.net_salary * getInternshipRatio(monthDate, internship)
    } else if (incomeType) {
      salary = incomeType.hours_per_week * incomeType.salary_per_hour * (1 - incomeType.tax_rate) * 4.34
    }

    // Costs — internship overrides config; gym+transport is stored in `other` for display
    let support: number, rent: number, food: number, fun: number, other: number
    if (internship) {
      support = internship.support_papa + internship.support_mama
      rent = internship.rent
      food = internship.food
      fun = internship.fun
      other = internship.gym + internship.transport
    } else {
      support = parseFloat(config.support_papa || '0') + parseFloat(config.support_mama || '0')
      rent = parseFloat(config.rent || '0')
      food = parseFloat(config.food_per_day || '0') * daysInMonth
      fun = parseFloat(config.fun_per_day || '0') * daysInMonth
      other = parseFloat(config.other_monthly || '0')
    }

    const insurance = config.insurance_active === 'true' ? parseFloat(config.insurance || '0') : 0
    const hasFlightFlag = dbMonth?.has_flight ?? false
    const flights = hasFlightFlag ? parseFloat(config.flight_price || '0') : 0
    const tuition = dbMonth?.tuition_fee ?? 0
    const annualFee = dbMonth?.annual_fee ?? 0
    const adjustment = dbMonth?.adjustment ?? 0

    const result =
      salary + support - rent - food - fun - other - insurance - flights - tuition - annualFee - adjustment

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
      insurance,
      flights,
      other,
      result,
      savings: runningSavings,
      internship: internship ?? null,
      income_type: incomeType,
    })
  }

  return results
}

export function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}
