import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

/**
 * Service-role Supabase client for use outside a logged-in user's request
 * context (webhooks, cron-triggered code). Bypasses RLS — never expose this
 * client or the underlying key to the browser.
 */
export function createServiceClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}
