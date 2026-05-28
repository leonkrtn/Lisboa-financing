export interface Config {
  [key: string]: string
}

export interface IncomeType {
  id: string
  name: string
  hours_per_week: number
  salary_per_hour: number
  tax_rate: number
}

export interface Month {
  id: string
  month_date: string
  income_type_id: string | null
  manual_salary: number | null
  tuition_fee: number
  annual_fee: number
  adjustment: number
  has_flight: boolean
}

export interface Internship {
  id: string
  name: string
  start_date: string
  end_date: string
  rent: number
  food: number
  fun: number
  gym: number
  transport: number
  gross_salary: number
  net_salary: number
  support_papa: number
  support_mama: number
}

export interface BalanceItem {
  id: string
  name: string
  amount: number
  category: 'Cash' | 'Receivables' | 'Provision'
  direction: '+' | '-'
  internship_id: string | null
}

export interface CalculatedMonth {
  month_date: string
  label: string
  month_id: string | null
  income_type_id: string | null
  manual_salary: number | null
  has_flight: boolean
  tuition_fee: number
  annual_fee: number
  adjustment: number
  salary: number
  support: number
  rent: number
  food: number
  fun: number
  insurance: number
  flights: number
  other: number
  result: number
  savings: number
  internship: Internship | null
  income_type: IncomeType | null
}
