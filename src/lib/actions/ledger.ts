'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveOrg } from '@/lib/session'
import { isPropertyManager } from '@/lib/orgAccess'
import type { AuthActionState } from '@/lib/actions/auth'

/**
 * Clears the "Due to Property Owners" / "Collections" liability by the given
 * amount — a real payout to an owner-client for a manager org, or a
 * withdrawal of the org's own collected funds for an owner-direct org.
 */
export async function recordOwnerPayout(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()
  const isPM = isPropertyManager(active.organization.org_type)

  const propertyId = String(formData.get('property_id') ?? '')
  const amount = Number(formData.get('amount') ?? 0)
  const payoutDate = String(formData.get('payout_date') ?? '') || new Date().toISOString().slice(0, 10)
  if (!propertyId || amount <= 0) return { error: 'Select a property and enter a valid amount.' }

  const { data: entryId, error } = await supabase.rpc('post_journal_entry', {
    p_org_id: active.org_id,
    p_entry_date: payoutDate,
    p_memo: String(formData.get('memo') ?? '') || (isPM ? 'Payout to property owner' : 'Withdrawal of collected funds'),
    p_source_type: 'owner_payout',
    p_source_id: crypto.randomUUID(),
    p_lines: [
      { account_code: '2200', property_id: propertyId, debit: amount, credit: 0 },
      { account_code: '1000', property_id: propertyId, debit: 0, credit: amount },
    ],
  })

  if (error) return { error: error.message }
  if (!entryId) return { error: 'Payout amount must be greater than zero.' }

  revalidatePath('/accounting')
  revalidatePath('/accounting/ledger')
  return { message: isPM ? 'Payout recorded.' : 'Withdrawal recorded.' }
}
