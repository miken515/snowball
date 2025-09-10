# Snowball – Budgeting App (Next.js + Expo + Tamagui + Supabase)

Cross‑platform monorepo:
- Web: apps/next (Next.js App Router)
- Native: apps/expo (Expo)
- Shared: packages/app (features/providers), packages/ui (Tamagui)

## Prerequisites
- Node 18+
- Yarn or PNPM
- Supabase project (URL + anon key)

## Install
- From repo root:
  - yarn install
  - yarn add @supabase/supabase-js react-native-url-polyfill @react-native-async-storage/async-storage

## Environment Variables
- Web (Next.js): apps/next/.env.local
  - NEXT_PUBLIC_SUPABASE_URL=YOUR_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
- Expo:
  - Add the same envs to your Expo config (e.g., apps/expo/app.config.ts) and expose them via `extra` so your app can read process.env at build time.

## Supabase Setup (Schema + RLS)
- In Supabase SQL editor (or a migration), run:

```sql
-- Core tables
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text check (type in ('checking','savings','credit','cash','investment')) default 'checking',
  created_at timestamptz default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text check (kind in ('expense','income','transfer')) default 'expense',
  parent_id uuid references public.categories(id) on delete set null,
  created_at timestamptz default now(),
  unique (user_id, name)
);

create table if not exists public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  created_at timestamptz default now(),
  unique (user_id, month)
);

create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_id uuid not null references public.monthly_budgets(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  amount_cents bigint not null check (amount_cents >= 0),
  created_at timestamptz default now(),
  unique (budget_id, category_id)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  amount_cents bigint not null, -- negative = outflow, positive = inflow
  description text,
  occurred_at date not null,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_tx_user_date on public.transactions (user_id, occurred_at desc);
create index if not exists idx_tx_user_acct_date on public.transactions (user_id, account_id, occurred_at desc);
create index if not exists idx_budget_items on public.budget_items (user_id, budget_id);
create index if not exists idx_categories_parent on public.categories (user_id, parent_id);

-- Views
create or replace view public.account_balances as
select a.id as account_id, a.user_id,
       coalesce(sum(t.amount_cents), 0)::bigint as balance_cents
from public.accounts a
left join public.transactions t on t.account_id = a.id
group by a.id;

create or replace view public.month_spend as
select user_id,
       date_trunc('month', occurred_at)::date as month,
       category_id,
       sum(case when amount_cents < 0 then -amount_cents else 0 end)::bigint as spent_cents,
       sum(case when amount_cents > 0 then amount_cents else 0 end)::bigint as income_cents
from public.transactions
group by user_id, date_trunc('month', occurred_at), category_id;

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.monthly_budgets enable row level security;
alter table public.budget_items enable row level security;
alter table public.transactions enable row level security;

create policy "profiles owner" on public.profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "accounts owner" on public.accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "categories owner" on public.categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "budgets owner" on public.monthly_budgets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "budget items owner" on public.budget_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "transactions owner" on public.transactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Realtime publication (optional, for live updates)
alter publication supabase_realtime add table accounts, categories, monthly_budgets, budget_items, transactions;

```

## Shared Supabase client
- `supabase.ts` (web + native):

```
import 'react-native-url-polyfill/auto'
import { Platform } from 'react-native'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

const getNativeStorage = () => {
  if (Platform.OS === 'web') return undefined
  const AsyncStorage = require('@react-native-async-storage/async-storage').default
  return AsyncStorage
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: getNativeStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
})
```

## Auth

-Provider is already wired: index.tsx wraps children with AuthProvider and Toasts.
- Login screen (shared): `login-screen.tsx`

- Home routing:
Web: `page.tsx` renders Login when signed out, Dashboard when signed in.

- Expo: index.tsx does the same.

## Run (Linux)
- Web (Next.js):
cd apps/next
yarn dev
open http://localhost:3000
- Native (Expo):
cd apps/expo
yarn start

## Feature Roadmap (recommended order)
- Data model locked (above schema).
- Accounts CRUD (list/create/edit/delete).
Categories CRUD.
- Transactions CRUD (+ category picker, account filter).
Budgets per month (budget_items) and progress using month_spend view.
- Dashboard: balances, month totals, budget progress, recent transactions.
- Polish: input validation, optimistic updates, toasts, loading states.

## Types and Realtime Hooks (optional)
- Generate DB types:
npm i -g supabase
supabase gen types typescript --project-id YOUR_PROJECT_ID > packages/app/lib/supabase.types.ts
- Create simple hooks (e.g., useTransactions) with select + realtime channel per table.

## Testing
- Unit tests for formatting/rollups.
Basic screen tests on web (Playwright or React Testing Library).

## Troubleshooting
- 401/403: verify NEXT_PUBLIC_SUPABASE_URL/KEY on both web and Expo.
- Realtime not firing: ensure tables are added to supabase_realtime publication.
- Native auth persistence: ensure @react-native-async-storage/async-storage installed and linked (handled by Expo).
