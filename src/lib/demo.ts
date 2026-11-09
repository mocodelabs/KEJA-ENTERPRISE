/**
 * Public demo account. The user and its sample organisation are created and re-seeded every hour
 * by the `reset_demo_data()` Postgres function (supabase/migrations/20260930010000_demo_account.sql).
 * These credentials are deliberately not secret — "Try the live demo" signs anyone in as this user —
 * and must match that migration.
 */
export const DEMO_EMAIL = 'demo@keja-demo.local'
export const DEMO_PASSWORD = 'KejaDemo#2026'

export function isDemoUser(email: string | null | undefined) {
  return email?.toLowerCase() === DEMO_EMAIL
}
