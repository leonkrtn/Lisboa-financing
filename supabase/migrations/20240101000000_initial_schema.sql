-- Lisboa Financing - Initial Schema

-- Config table for global settings
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Income types (e.g. student job, freelance, etc.)
CREATE TABLE IF NOT EXISTS income_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  hours_per_week NUMERIC NOT NULL DEFAULT 0,
  salary_per_hour NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0
);

-- Monthly overrides and flags
CREATE TABLE IF NOT EXISTS months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_date DATE NOT NULL UNIQUE,
  income_type_id UUID REFERENCES income_types(id) ON DELETE SET NULL,
  manual_salary NUMERIC,
  tuition_fee NUMERIC NOT NULL DEFAULT 0,
  annual_fee NUMERIC NOT NULL DEFAULT 0,
  adjustment NUMERIC NOT NULL DEFAULT 0,
  has_flight BOOLEAN NOT NULL DEFAULT false
);

-- Internship periods with their own cost/income structure
CREATE TABLE IF NOT EXISTS internships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rent NUMERIC NOT NULL DEFAULT 0,
  food NUMERIC NOT NULL DEFAULT 0,
  fun NUMERIC NOT NULL DEFAULT 0,
  gym NUMERIC NOT NULL DEFAULT 0,
  transport NUMERIC NOT NULL DEFAULT 0,
  gross_salary NUMERIC NOT NULL DEFAULT 0,
  net_salary NUMERIC NOT NULL DEFAULT 0,
  support_papa NUMERIC NOT NULL DEFAULT 0,
  support_mama NUMERIC NOT NULL DEFAULT 0
);

-- Balance items representing initial financial state
CREATE TABLE IF NOT EXISTS balance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL CHECK (category IN ('Cash', 'Receivables', 'Provision')),
  direction TEXT NOT NULL CHECK (direction IN ('+', '-')),
  internship_id UUID REFERENCES internships(id) ON DELETE SET NULL
);

-- Seed default config values
INSERT INTO config (key, value) VALUES
  ('rent', '0'),
  ('food_per_day', '0'),
  ('fun_per_day', '0'),
  ('insurance', '0'),
  ('insurance_active', 'false'),
  ('flight_price', '0'),
  ('other_monthly', '0'),
  ('support_papa', '0'),
  ('support_mama', '0'),
  ('start_month', to_char(date_trunc('month', CURRENT_DATE), 'YYYY-MM-DD')),
  ('num_months', '24')
ON CONFLICT (key) DO NOTHING;
