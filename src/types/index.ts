export interface Config {
  [key: string]: string
}

export interface IncomeType {
  id: string
  name: string
  type: 'hourly' | 'manual'
  hours_per_week: number
  salary_per_hour: number
  tax_rate: number
  manual_amount: number
}

export interface ExpenseCategory {
  id: string
  name: string
  type: 'monthly' | 'daily' | 'once' | 'yearly'
  default_amount: number
  once_month: string | null  // YYYY-MM-DD
  yearly_month: number | null  // 1–12
  start_month: string | null  // YYYY-MM-DD, monthly/daily apply from this month
}

export interface CapitalItem {
  id: string
  name: string
  amount: number
  category: 'Cash' | 'Receivables' | 'Payables' | 'Provisions'
}

export interface Internship {
  id: string
  name: string
  start_date: string
  end_date: string
  income_mode: 'hourly' | 'manual'
  hours_per_week: number
  salary_per_hour: number
  tax_rate: number
  manual_salary: number
}

export interface InternshipExpenseOverride {
  id: string
  internship_id: string
  expense_category_id: string
  amount: number
}

export interface MonthData {
  id: string
  month_date: string
  income_type_id: string | null
  manual_salary: number | null
}

export interface MonthExpenseOverride {
  id: string
  month_date: string
  expense_category_id: string
  amount: number
}

export interface CalculatedMonthExpense {
  category_id: string
  name: string
  amount: number
  is_override: boolean
}

export interface CalculatedMonth {
  month_date: string
  label: string
  income: number
  income_label: string
  expenses: CalculatedMonthExpense[]
  total_expenses: number
  result: number
  cumulative: number
  internship: Internship | null
  income_type: IncomeType | null
  month_data: MonthData | null
}
