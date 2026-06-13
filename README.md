# Household Maids

A cleaning-services platform for Gauteng, South Africa — operated by Mukhoni Cleaning
Specialists. One Next.js codebase covers four surfaces:

| Surface | Path | Who |
|---|---|---|
| **Marketing site** | `/` | Public |
| **Customer app** | `/app/*` | Customers (mobile-first) |
| **Helper app** | `/helper/*` | Cleaners — public application + vetted dashboard |
| **Admin console** | `/admin/*` | Operations admins (desktop) |

Built from a Claude Design prototype into a real, secure, full-stack application:
server-authoritative pricing, role-based access control, a referral/wallet/payout
system, in-app messaging, ratings, recurring bookings, and Payfast payments.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **PostgreSQL** + **Prisma**
- **Auth.js (NextAuth v5)** credentials auth, Argon2id hashing, JWT sessions, RBAC
- **Payfast** for inbound payments (signed checkout + verified ITN webhook)
- **Vitest** (unit) + **Playwright** (e2e)

## Quick start

```bash
# 1. Install
npm install

# 2. Environment — copy the template and fill secrets
cp .env.example .env
#   then generate real secrets:
#   openssl rand -base64 32   → AUTH_SECRET
#   openssl rand -base64 32   → ENCRYPTION_KEY   (must decode to 32 bytes)

# 3. Database (local Postgres via Docker on port 5433)
npm run db:up        # docker compose up -d
npm run db:push      # apply the Prisma schema
npm run db:seed      # services, areas, add-ons, settings, demo users

# 4. Run
npm run dev          # http://localhost:3000
```

No Docker? Point `DATABASE_URL` at any Postgres (e.g. a free Neon/Supabase instance)
and run `db:push` + `db:seed`.

### Demo logins (password `Password123!`)

| Role | Email |
|---|---|
| Customer | `thandi@email.co.za` |
| Helper | `lindiwe@email.co.za` |
| Admin | `admin@householdmaids.co.za` |

## How the money works

All amounts are stored as **integer cents**. Pricing is **server-authoritative** —
`lib/pricing.ts` recomputes every total from trusted DB rates; the client estimate is
display-only.

- **Booking price** = service base (rooms: `base + beds·R90 + baths·R70`, or hours:
  `max(hours, minHours)·rate`) + add-ons − recurring discount (15% weekly / 10%
  biweekly) − first-booking referral discount. Clamped at ≥ 0.
- **Referrals** are verified by **payment, not signup**. When a referred friend's
  *first* booking is paid (via the Payfast ITN), the referrer earns R50 into their
  wallet (`lib/booking.ts → markBookingPaid`, idempotent). No cap; first booking only.
- **Wallet** balance is **derived from an append-only ledger** (`WalletTransaction`),
  never a mutable field. Withdrawals have no minimum and no fee.
- **Payouts** run weekly: requests by Thursday 23:59 are paid the following Friday. The
  admin "Run Friday payout" batches requests and produces a bank-import CSV via the
  swappable payout adapter (`lib/payout.ts`). Customers/helpers can download a CSV
  statement.

All program rates (reward, discount, per-room rates, recurring %) are admin-tunable in
**Admin → Rewards & discounts** and read server-side for every calculation.

## Security

- Argon2id password hashing; httpOnly/sameSite session cookies; rate-limited auth.
- **RBAC** enforced in middleware *and* in every server action/page via `requireRole`
  / `assertRole` (defence in depth); object-level checks on bookings/wallet/chat.
- **Zod** validation on every mutation; Prisma parameterized queries; React output
  escaping.
- **Payfast ITN** verified four ways before crediting anything: signature → source host
  → server-to-server validation → amount match. Browser return URLs never finalise
  payment. Idempotent on provider reference.
- **PII at rest** (ID numbers, bank details) encrypted with AES-256-GCM (`lib/crypto.ts`,
  key from `ENCRYPTION_KEY`). Helper documents go to private storage, not `/public`.
- Security headers + CSP in `next.config.ts`; secrets only in env; sensitive actions
  written to an `AuditLog`.

> POPIA-aware structure (consent capture for background checks, encrypted PII, data
> minimization). A full legal/compliance review is out of scope for this build.

## Integrations (swappable adapters)

`lib/payfast.ts` (payments in), `lib/payout.ts` (payouts out — default bank-batch CSV),
`lib/storage.ts` (documents), `lib/notify.ts` (email/SMS/push — dev console sink).
Each is an interface you can repoint at a real provider without touching callers.
Real ID/background-check vendors are wired as stubs the admin vetting board drives.

## Testing

```bash
npm run test       # Vitest unit tests — pricing, money, payout CSV, crypto, Payfast sig
npm run test:e2e   # Playwright — book→pay→track→rate, referral earning, RBAC, admin, helper
```

The e2e suite uses the Payfast **dev simulate** path (`simulatePaymentAction`, disabled
in production) because a sandbox ITN can't reach `localhost`.

## Project layout

```
app/(marketing)/        Landing page
app/(auth)/             Login + signup
app/(customer)/app/     Customer flow + bottom-tab shell
app/helper/             Helper application + dashboard + jobs
app/admin/              Admin console
app/actions/            Server actions (auth, booking, wallet, helper, admin)
app/api/payfast/itn/    Payment webhook
lib/                    db, auth, rbac, pricing, booking, wallet, payfast, payout,
                        crypto, settings, validation, audit, notify, storage, …
prisma/                 schema.prisma + seed.ts
components/             ui / app / auth / helper / admin
tests/                  unit (vitest) + e2e (playwright)
```

## Production notes

- Set strong `AUTH_SECRET` / `ENCRYPTION_KEY`, `PAYFAST_SANDBOX=false` with live
  merchant credentials + passphrase, and a public `NEXT_PUBLIC_BASE_URL` so Payfast can
  reach `/api/payfast/itn`.
- Swap the in-memory rate limiter (`lib/rate-limit.ts`) for Redis/Upstash if running
  multiple instances.
- Run `prisma migrate deploy` against your managed Postgres instead of `db:push`.
