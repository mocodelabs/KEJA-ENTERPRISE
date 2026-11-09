# KEJA Enterprise

Property management system for property managers and property owners — properties, tenants, billing, payments, messaging, accounting/reconciliation, reports, and internal ops (HR/payroll, equipment, stationery), built on Next.js + Supabase.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) + Tailwind CSS v4
- **Supabase**: Postgres (with RLS), Auth, Edge Functions, pg_cron
- Charts: Recharts · Icons: lucide-react · Toasts: sonner

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 (or the port shown). `.env.local` already points at the project's Supabase instance — copy `.env.local.example` if you need a fresh setup elsewhere.

Sign up, create an organization on the onboarding screen (choose "property manager" or "own my property directly"), and you're in.

## Account types, signup and tax identity

- **Account type is chosen once, at signup**, together with the organization name, the owner's **National ID** and **KRA PIN**. These are held on the auth user's metadata (`pending_org_name`, `pending_org_type`, `pending_owner_national_id`, `pending_owner_kra_pin`) rather than a cookie, because an email-confirmation link often opens on a different device. If signup returns a session straight away the organization is created immediately (`create_organization` RPC); otherwise the onboarding screen is pre-filled from the metadata after the first login, and the metadata is cleared once the organization exists. Login never re-asks the question.
- **Property manager (`manager`) vs direct owner (`owner_direct`)**: owner-direct organizations don't see owner clients, per-property commission, reconciliation or the commission settings anywhere — the nav (`src/lib/nav.ts`, `pmOnly`), route redirects, forms and server actions are all gated through `isPropertyManager()` in `src/lib/orgAccess.ts`. Their default commission is 0%, and the ledger's "Due to Property Owners" account is shown as **Collections**.
- **Tax identity** (groundwork for a later tax feature): **optional while the platform is in trial** — signup, onboarding and Settings all accept blank values (stored as null) and can be filled in later. A value that is provided is still validated by `parseTaxIdentity` in `src/lib/kenyaId.ts` — National ID is 6–10 digits, KRA PIN is `A123456789Z` format (letter, 9 digits, letter; stored uppercase). To make them mandatory again, add `required` to the inputs and reject blanks in `parseTaxIdentity`. Stored on the organization (migration `20260928000000_owner_tax_identity.sql`) and editable under **Settings → Organization** (`updateOwnerTaxIdentity`).

## Landing page and brochure

The public landing page at `/` is the static sales page in `public/brochure/index.html` (served via a `beforeFiles` rewrite in `next.config.ts`; it also lives at `/brochure`), with Log in / Sign up / Book a demo buttons. Signed-in users who open `/` are redirected to `/dashboard` by `src/lib/supabase/middleware.ts`, and `/brochure/*` is exempt from the login redirect. The downloadable PDF (`public/brochure/KEJA-Enterprise-Brochure.pdf`) is rendered from the same HTML via its print stylesheet — after editing the HTML, regenerate it with headless Edge/Chrome: `msedge --headless --no-pdf-header-footer --print-to-pdf=KEJA-Enterprise-Brochure.pdf file:///<path>/public/brochure/index.html`.

## Live demo account

"Try the live demo" (`/demo`) signs a visitor in as a shared demo user in a fully populated sample organisation (3 properties, 17 units, 14 tenants, three months of invoices/payments/receipts, expenses, maintenance, commission reconciliation, payroll staff, equipment and stationery). Everything is created by Postgres, not app code:

- `seed_demo_data()` / `reset_demo_data()` (migrations `20260930010000_demo_account` and `20260930020000_demo_reset_stable_user`) wipe the demo user's organisations — including any a visitor creates — repair the demo account (email, password, metadata) and re-seed with dates relative to today.
- `pg_cron` job `keja-demo-reset` runs it **every hour**; run `select public.reset_demo_data();` for an on-demand reset. Neither function is executable by `anon`/`authenticated`.
- The demo credentials (`src/lib/demo.ts`) are intentionally public. Keep them in sync with the migration. The demo user can't upload files (storage policy `demo_user_no_uploads` + a friendly app-level message), and a banner in the dashboard offers "Create your own account" (`/demo/exit`).

## Architecture

- `src/app/(dashboard)/**` — one route per module (properties, tenants, leases, billing, payments, messaging, quotes/credit notes, accounting, reports, HR, assets, settings). Each page is a Server Component that fetches org-scoped data; mutations go through Server Actions in `src/lib/actions/*`.
- `src/lib/services/*` — business logic independent of UI:
  - `billingEngine.ts` — invoice generation from active leases + meter readings, penalty application, reminder cadence.
  - `commissionEngine.ts` — per-property/period revenue, commission, expenses, net-to-owner reconciliation.
  - `payrollEngine.ts` — payroll run generation from active employees.
  - `messagingService.ts` — SMS template rendering + provider abstraction (see below). Messages can be sent to individually selected tenants (multi-select) or to every tenant with an active lease in a chosen property or block.
  - `reportsService.ts` — property/tenant performance and revenue trend aggregation.
- `src/lib/supabase/*` — browser/server Supabase clients and the session-refresh helper used by `src/proxy.ts`.
- `supabase/functions/daily-cycle` — scheduled Edge Function (see Automation below).
- **Pagination**: every list page is paginated at 10 rows (`src/lib/pagination.ts` — `parsePage`, `getPageRange`, `getTotalPages`, `PAGE_SIZE` — and the shared `src/components/dashboard/pagination.tsx`, which keeps other query params intact). Pages that show several lists (e.g. a tenant's invoices, meters and maintenance, or a property's units) give each list its own query param (`invoices_page`, `units_page`, …) via the component's `paramName` prop so they page independently. Summary figures use a separate unpaginated query so totals never depend on the current page.
- **Dashboard**: the unit-occupancy donut (`src/components/dashboard/unit-status-pie-chart.tsx`) shows the occupied percentage in the centre and an HTML legend with Occupied / Vacant / Maintenance percentages below, so nothing is clipped in narrow cards.
- Multi-tenancy: every business table is scoped by `org_id` with Postgres RLS policies (`is_org_member` / `has_org_role` helper functions). A user can belong to multiple organizations; the active one is tracked via the `keja_active_org` cookie and switched from the top bar.

## Accounting / general ledger

Every organization gets a real double-entry ledger (chart of accounts, journal entries, journal lines — see migration `20260921000000_general_ledger.sql`), posted automatically by Postgres triggers off the tables that already exist, not by app code, so it can't be bypassed by any code path (webhooks, the daily-cycle edge function, manual actions):

- **Model**: this is trust accounting for a property *management* company. Rent collected isn't the org's own income — it's held for the property owner, so a payment credits **Due to Property Owners** (2200), not an income account. A property-linked expense debits that same liability (paid out of the owner's money). The org's own revenue is **Commission Income** (4900), recognized only at the moment a reconciliation is marked reconciled on the Reconciliation page — never automatically. Non-property expenses (payroll, stationery, general/office) are the org's own and hit its own expense accounts.
- **Wired automatically**: `payments` (insert) → collection; `expenses` (insert/update/delete, with automatic reversal on edit or delete so the ledger never goes stale) → property draw-down or org expense by category; `payroll_runs` (status → processed) → payroll expense; `commission_ledger` (status → reconciled) → commission recognition; `leases` (insert, and update of `deposit_amount`) → security deposit collected into **Security Deposits Held** (2100); `lease_terminations` (update of `refunded` → true) → deposit settled, splitting it between a cash refund to the tenant and recovery into Due to Property Owners for whatever was deducted (arrears, water/electricity, damage).
- **Manual entry points** (both post through the same `post_journal_entry()` Postgres function every trigger uses — clients never insert into `journal_entries`/`journal_lines` directly, RLS only grants them `select`): recording an actual payout to an owner (property breakdown on the Accounting Overview page), and marking a lease termination's deposit as refunded/settled (the termination report page — a deliberate confirmation step, same pattern as "mark reconciled").
- **Pages**: `/accounting` (Overview) — cash, deposits-held, and owner-liability balances, income/expense/commission breakdown by property for a chosen period, a deposits-added/deducted breakdown, plus the org's own P&L. `/accounting/ledger` — the chart of accounts with running balances and the full journal, most recent first.
- **Deposit held/refunded is also visible on the Leases and Tenant pages** — each lease shows its deposit amount, and once terminated, whether the deposit has been settled yet.
- **Known gap**: equipment purchases aren't posted to the ledger yet (equipment is just an asset registry today, with no expense/cash flow tied to adding one).

## Automation

A daily job (`supabase/functions/daily-cycle`, scheduled via `pg_cron` — see the `keja-daily-cycle` job) does, for every organization:

1. On the last day of the month only: generates next month's rent invoices for active leases (idempotent — skips leases already billed for the period) and immediately sends each tenant an "invoice issued" message, so they have notice before the new period's due date.
2. On the last day of the month only: computes a "pending" `commission_ledger` reconciliation (gross revenue, commission, expenses, net-to-owner) for every property, for the month that just ended. This never touches a property/period a user already marked **reconciled** on the Reconciliation page — that confirmation is a deliberate human step and is never overwritten by automation, on this schedule or a manual re-run.
3. Every day: marks invoices overdue past their due date.
4. Every day: applies the configured penalty rule once a set grace period has passed.
5. Every day: sends "rent due" / "partial payment" SMS reminders on a repeating cadence, both configurable per org under **Settings → Organization**.

The penalty/reminder half of this (`runBillingAutomation` in `lib/services/billingEngine.ts`) is also exposed as a manual **"Run billing automation now"** button on the Invoices page. Invoice generation itself has its own manual form on that same page (pick any period, not just next month) — it also sends the "invoice issued" message per invoice created.

## Stubbed integrations — swap these in for production

No live SMS or payment credentials are wired in. Everything routes through provider interfaces so swapping in real ones is a small, contained change:

- **SMS/WhatsApp** — orgs configure their own provider under **Settings → SMS/WhatsApp Gateway** (`src/lib/services/messagingService.ts`); each provider class (e.g. `AfricasTalkingProvider`) has a commented-out `fetch` call ready to complete. Until wired, messages are logged to `messages_log` and printed to the server console instead of sent. Note: the `daily-cycle` Edge Function has its own copy of the SMS-sending stub (Deno can't import the Next.js app's code) and still only checks the `AFRICASTALKING_API_KEY` env var/secret rather than the per-org DB-configured gateway — bring it to parity with `messagingService.ts` if you need automated messages (invoice-issued, reminders, penalties) to use an org's configured gateway rather than the console stub.
- **Payments (M-Pesa / bank)** — invoices can still be settled manually via the Payments page, but two Route Handlers now accept automatic payment notifications and apply them the same way `recordPayment` does (record payment → auto-generate receipt via DB trigger → send it): `src/app/api/webhooks/mpesa/[orgId]/route.ts` implements Safaricom Daraja's real C2B Confirmation payload shape (register `https://<domain>/api/webhooks/mpesa/{orgId}` as your Confirmation URL once you have live Daraja credentials — the URL is shown per-org under **Settings → Payment Gateways**), and `src/app/api/webhooks/bank/[orgId]/route.ts` is a generic stub to adapt to whichever bank API you integrate (there's no universal standard). Both match the incoming payment to a tenant by phone number and apply it to their oldest open invoice — swap in a stabler match key (e.g. an account reference) if phone-matching isn't reliable enough for your tenants. Paybill and Till gateways (`src/lib/paymentProviders.ts`) can optionally store Daraja API credentials (consumer key, consumer secret, passkey, plus a sandbox/production environment); secrets are masked when shown back in the settings UI. They're captured for future automated collection but aren't used to call Daraja yet. Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` since webhooks have no logged-in user session to authenticate as.
- **Email** — `src/lib/services/emailService.ts`, following the same interface pattern as SMS/WhatsApp. Set `RESEND_API_KEY` / `RESEND_FROM_EMAIL` in `.env.local` to activate Resend and complete the commented-out `fetch` call in `ResendEmailProvider.send()`; until then, emails are logged to the server console. `sendDocumentByEmail()` renders a `PdfDocument` (the same shape used for print/download) to PDF bytes server-side and emails it as an attachment — used by Quotes and Credit Notes (`DocumentActions`' "Send via Email" / "Send via WhatsApp" buttons, shown only when the recipient has an email/phone on file). Any other document type (invoices, receipts) can get the same buttons by passing `onSendEmail/onSendWhatsApp` to its `DocumentActions`.

## Notes

- Payroll deductions are modeled as a generic line item; exact statutory tables (PAYE/NSSF/NHIF, etc.) aren't hardcoded — extend `lib/services/payrollEngine.ts` when you have the specific rules you need.
- Deployment isn't configured yet — this has only been run locally / previewed. Any Node host that supports Next.js 16 works (Vercel is the default target for `next build`).
