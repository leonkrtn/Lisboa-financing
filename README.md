# Lisboa Financing

A personal finance planning app built with Next.js 14, TypeScript, Tailwind CSS, Recharts, and Supabase. It lets you model your financial future month by month, including income types, internships, recurring costs, and an initial balance.

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd Lisboa-financing
npm install
```

### 2. Create environment file

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run the database migration

1. Open your [Supabase project](https://app.supabase.com)
2. Go to **SQL Editor**
3. Paste the contents of `supabase/migrations/20240101000000_initial_schema.sql`
4. Click **Run**

This creates all required tables and seeds default config values.

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the Overview page.

---

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (found in Project Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key |

---

## Pages

### Overview (`/overview`)
Dashboard with 4 KPI cards (Total Savings, Avg Monthly Result, Next Month Net Income, Avg Monthly Cost), a savings/result line chart, and a compact summary table of all months.

### Months (`/months`)
Full spreadsheet-style editable table. Each row represents one month in your planning horizon. You can assign an income type, set a manual salary override, flag flights, add tuition/annual fees and one-off adjustments. Calculated columns (salary, rent, food, result, savings) update automatically. Internship months are highlighted in blue.

### Config (`/config`)
Global settings form. Controls recurring monthly costs (rent, food/day, fun/day, insurance, other), flight price, family support amounts, and the planning horizon (start month + number of months).

### Income Types (`/income-types`)
Define your income sources (e.g. student job, freelance). Each type has hours/week, salary/hour, and tax rate. Monthly net income is calculated automatically as `hours × salary × (1 − tax) × 4.34`.

### Internships (`/internships`)
Define internship periods with their own cost/income structure. Internships override global config for the months they cover. Prorata calculations handle partial months automatically. Overlap validation prevents conflicting internship dates.

### Balance (`/balance`)
Initial financial state. Add cash, receivables, and provisions. Items can be linked to an internship, in which case their effective value is computed as `net_salary × duration_months`. The total initial savings feeds into the running savings calculation in the Months table.

---

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Recharts** (line charts)
- **Supabase** (PostgreSQL database via `@supabase/supabase-js`)
- No authentication — fully open app
