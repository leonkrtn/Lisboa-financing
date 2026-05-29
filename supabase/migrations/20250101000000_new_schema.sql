-- Lisboa Financing v2 — Full rebuild schema

-- Remove old tables
DROP TABLE IF EXISTS balance_items CASCADE;
DROP TABLE IF EXISTS months CASCADE;
DROP TABLE IF EXISTS internships CASCADE;
DROP TABLE IF EXISTS income_types CASCADE;
DROP TABLE IF EXISTS config CASCADE;

-- Global config (key-value)
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- Income types: hourly (hours × rate × tax) or manual (flat net amount)
CREATE TABLE income_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'hourly' CHECK (type IN ('hourly', 'manual')),
  hours_per_week NUMERIC NOT NULL DEFAULT 0,
  salary_per_hour NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  manual_amount NUMERIC NOT NULL DEFAULT 0
);

-- Expense categories: monthly | daily (× days) | once (specific month) | yearly (same month each year)
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'monthly' CHECK (type IN ('monthly', 'daily', 'once', 'yearly')),
  default_amount NUMERIC NOT NULL DEFAULT 0,
  once_month DATE,        -- for type='once': YYYY-MM-01
  yearly_month INT        -- for type='yearly': 1-12
);

-- Capital snapshot: Cash + Receivables − Payables − Provisions = net capital
CREATE TABLE capital_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL CHECK (category IN ('Cash', 'Receivables', 'Payables', 'Provisions'))
);

-- Internship periods with their own income and expense overrides
CREATE TABLE internships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  income_mode TEXT NOT NULL DEFAULT 'manual' CHECK (income_mode IN ('hourly', 'manual')),
  hours_per_week NUMERIC NOT NULL DEFAULT 0,
  salary_per_hour NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  manual_salary NUMERIC NOT NULL DEFAULT 0
);

-- Per-category expense overrides during an internship period
CREATE TABLE internship_expense_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id UUID NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  expense_category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  UNIQUE (internship_id, expense_category_id)
);

-- Per-month income overrides (income type assignment or manual salary)
CREATE TABLE month_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_date DATE NOT NULL UNIQUE,
  income_type_id UUID REFERENCES income_types(id) ON DELETE SET NULL,
  manual_salary NUMERIC
);

-- Seed default config
INSERT INTO config (key, value) VALUES
  ('start_month', to_char(date_trunc('month', CURRENT_DATE), 'YYYY-MM-DD')),
  ('num_months', '24')
ON CONFLICT (key) DO NOTHING;
