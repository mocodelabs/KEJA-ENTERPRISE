import type { Enums } from '@/lib/types/database'

/**
 * "manager" orgs run properties on behalf of separate owners (owner clients,
 * commission, reconciliation/payouts). "owner_direct" orgs own what they
 * manage themselves, so those concepts don't apply — there's no one else to
 * take a commission from or remit funds to.
 */
export function isPropertyManager(orgType: Enums<'org_type'>) {
  return orgType === 'manager'
}
