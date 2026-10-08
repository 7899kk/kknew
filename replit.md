# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server (with Clerk auth middleware)
│   └── wealthtrack/        # Expo mobile app (Pro Financier)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
└── pnpm-workspace.yaml     # pnpm workspace config
```

## Pro Financier Mobile App (`artifacts/wealthtrack`)

A production-ready personal finance mobile app rebranded as "Pro Financier".

### Branding
- App name: **Pro Financier**
- Primary color: `#0d7377` (teal)
- Gold accent: `#d4a017`
- Logo: `assets/images/logo.jpg`
- Currency: Indian Rupee (₹) with K/L/Cr shortforms

### Features

- **Authentication**: Clerk email+password sign-in/sign-up with email verification
- **Onboarding Wizard**: Step-by-step setup with name, username, salary, savings, dream goals
- **Dashboard**: Net worth hero card, expense breakdown, top goal, investment snapshot
- **Expense Tracker**: Full CRUD with categories (Food/Travel/Rent/EMI/Shopping/Entertainment/Medical/Education/Others), payment types, monthly/yearly/all views, Auto Expenses (recurring monthly)
- **Debt Tracker**: Track money owed (debit) and receivable (credit) with interest rates and due dates
- **Investment Tracker**: Stocks (NSE/BSE/NYSE/NASDAQ), Crypto, Gold/Silver with live price fetch (Yahoo Finance + CoinGecko), P&L display, pull-to-refresh
- **Savings Goals**: Bike/Car/Flat/Emergency/Custom categories with progress bars and time estimates
- **Bill Splitter**: Groups with members, expense splitting, auto-settlement calculation
- **Profile**: Photo (expo-image-picker), username, financial summary, sign-out via Clerk

### Tech
- React Native / Expo Router (SDK 54)
- Clerk (`@clerk/expo`) for authentication
- AsyncStorage for data persistence
- Context API (AppContext) for state management
- `react-native-svg` for mini charts
- Inter font family
- Dark mode support via `useColorScheme`
- Live market data: Yahoo Finance (stocks + gold via GC=F/SI=F), CoinGecko (crypto)

### Key Files
- `context/AppContext.tsx` — central state (profile, expenses, autoExpenses, debts, stocks, cryptos, goldSilver, goals, billGroups)
- `utils/marketData.ts` — free API fetchers (no key needed)
- `components/UI.tsx` — shared UI (PillSelector uses `value`/`onChange` NOT `selected`/`onSelect`)
- `components/ProFinancierHeader.tsx` — teal gradient header with logo
- `app/(auth)/sign-in.tsx`, `app/(auth)/sign-up.tsx` — Clerk auth screens
- `app/_layout.tsx` — ClerkProvider wraps everything

### Important Notes
- PillSelector API: `value` + `onChange` props (NOT `selected`/`onSelect`)
- Net worth formula: `totalIncome + totalInvestments - totalDebt`
- GoldSilverEntry has `assetName` field
- UserProfile has `username` and `profilePhoto` fields

## API Server (`artifacts/api-server`)

Express API server with Clerk middleware for auth.

### Auth
- Clerk middleware via `@clerk/express`
- Proxy middleware for Clerk Frontend API at `/__clerk`
- Protected routes use `getAuth(req)` to check user identity

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only `.d.ts` files during typecheck; JS bundling by esbuild/tsx/vite
- **Project references** — when package A depends on B, A's `tsconfig.json` must list B in `references`

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`
