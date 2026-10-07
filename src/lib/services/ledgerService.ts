import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

type DB = SupabaseClient<Database>

export function accountBalance(type: string, totalDebit: number, totalCredit: number) {
  return type === 'asset' || type === 'expense' ? totalDebit - totalCredit : totalCredit - totalDebit
}

export async function getChartOfAccountsWithBalances(supabase: DB, orgId: string) {
  const [{ data: accounts }, { data: lines }] = await Promise.all([
    supabase.from('accounts').select('*').eq('org_id', orgId).order('code'),
    supabase.from('journal_lines').select('account_id, debit, credit').eq('org_id', orgId),
  ])

  const totals = new Map<string, { debit: number; credit: number }>()
  for (const line of lines ?? []) {
    const t = totals.get(line.account_id) ?? { debit: 0, credit: 0 }
    t.debit += Number(line.debit)
    t.credit += Number(line.credit)
    totals.set(line.account_id, t)
  }

  return (accounts ?? []).map((a) => {
    const t = totals.get(a.id) ?? { debit: 0, credit: 0 }
    return { ...a, totalDebit: t.debit, totalCredit: t.credit, balance: accountBalance(a.type, t.debit, t.credit) }
  })
}

/**
 * Breaks down the "Due to Property Owners" liability by property: the
 * all-time running balance (what's owed right now) plus this period's
 * activity (rent collected, property expenses paid, commission recognized,
 * owner payouts) classified by the journal entry's source_type.
 */
export async function getPropertyLedgerBreakdown(supabase: DB, orgId: string, periodStart: string, periodEnd: string) {
  const [{ data: dueAccount }, { data: properties }] = await Promise.all([
    supabase.from('accounts').select('id').eq('org_id', orgId).eq('code', '2200').single(),
    supabase.from('properties').select('id, name').eq('org_id', orgId).order('name'),
  ])

  if (!dueAccount || !properties) return []

  const { data: allTimeLines } = await supabase
    .from('journal_lines')
    .select('property_id, debit, credit')
    .eq('org_id', orgId)
    .eq('account_id', dueAccount.id)

  const { data: periodEntries } = await supabase
    .from('journal_entries')
    .select('id, source_type')
    .eq('org_id', orgId)
    .gte('entry_date', periodStart)
    .lte('entry_date', periodEnd)

  const entrySourceById = new Map((periodEntries ?? []).map((e) => [e.id, e.source_type]))
  const periodEntryIds = (periodEntries ?? []).map((e) => e.id)

  const { data: periodLines } = periodEntryIds.length
    ? await supabase
        .from('journal_lines')
        .select('property_id, debit, credit, entry_id')
        .eq('org_id', orgId)
        .eq('account_id', dueAccount.id)
        .in('entry_id', periodEntryIds)
    : { data: [] }

  const balances = new Map<string, number>()
  for (const l of allTimeLines ?? []) {
    if (!l.property_id) continue
    balances.set(l.property_id, (balances.get(l.property_id) ?? 0) + Number(l.credit) - Number(l.debit))
  }

  type Activity = { collections: number; expenses: number; commission: number; payouts: number }
  const activity = new Map<string, Activity>()
  for (const l of periodLines ?? []) {
    if (!l.property_id) continue
    const bucket: Activity = activity.get(l.property_id) ?? { collections: 0, expenses: 0, commission: 0, payouts: 0 }
    const sourceType = entrySourceById.get(l.entry_id)
    if (sourceType === 'payment') bucket.collections += Number(l.credit)
    else if (sourceType === 'expense') bucket.expenses += Number(l.debit)
    else if (sourceType === 'reconciliation') bucket.commission += Number(l.debit)
    else if (sourceType === 'owner_payout') bucket.payouts += Number(l.debit)
    activity.set(l.property_id, bucket)
  }

  return properties.map((p) => ({
    id: p.id,
    name: p.name,
    balanceDue: balances.get(p.id) ?? 0,
    ...(activity.get(p.id) ?? { collections: 0, expenses: 0, commission: 0, payouts: 0 }),
  }))
}

/**
 * Breaks down the "Security Deposits Held" liability by property: the
 * all-time running balance plus this period's deposits collected (added)
 * and deposits settled on termination (deducted).
 */
export async function getDepositBreakdown(supabase: DB, orgId: string, periodStart: string, periodEnd: string) {
  const [{ data: depositAccount }, { data: properties }] = await Promise.all([
    supabase.from('accounts').select('id').eq('org_id', orgId).eq('code', '2100').single(),
    supabase.from('properties').select('id, name').eq('org_id', orgId).order('name'),
  ])

  if (!depositAccount || !properties) return []

  const { data: allTimeLines } = await supabase
    .from('journal_lines')
    .select('property_id, debit, credit')
    .eq('org_id', orgId)
    .eq('account_id', depositAccount.id)

  const { data: periodEntries } = await supabase
    .from('journal_entries')
    .select('id, source_type')
    .eq('org_id', orgId)
    .gte('entry_date', periodStart)
    .lte('entry_date', periodEnd)

  const entrySourceById = new Map((periodEntries ?? []).map((e) => [e.id, e.source_type]))
  const periodEntryIds = (periodEntries ?? []).map((e) => e.id)

  const { data: periodLines } = periodEntryIds.length
    ? await supabase
        .from('journal_lines')
        .select('property_id, debit, credit, entry_id')
        .eq('org_id', orgId)
        .eq('account_id', depositAccount.id)
        .in('entry_id', periodEntryIds)
    : { data: [] }

  const balances = new Map<string, number>()
  for (const l of allTimeLines ?? []) {
    if (!l.property_id) continue
    balances.set(l.property_id, (balances.get(l.property_id) ?? 0) + Number(l.credit) - Number(l.debit))
  }

  type Activity = { added: number; deducted: number }
  const activity = new Map<string, Activity>()
  for (const l of periodLines ?? []) {
    if (!l.property_id) continue
    const bucket: Activity = activity.get(l.property_id) ?? { added: 0, deducted: 0 }
    const sourceType = entrySourceById.get(l.entry_id)
    if (sourceType === 'deposit') bucket.added += Number(l.credit)
    else if (sourceType === 'deposit_settlement') bucket.deducted += Number(l.debit)
    activity.set(l.property_id, bucket)
  }

  return properties
    .map((p) => ({
      id: p.id,
      name: p.name,
      held: balances.get(p.id) ?? 0,
      ...(activity.get(p.id) ?? { added: 0, deducted: 0 }),
    }))
    .filter((row) => row.held !== 0 || row.added !== 0 || row.deducted !== 0)
}

/** The org's own income statement: commission earned less its own operating expenses. */
export async function getOrgIncomeStatement(supabase: DB, orgId: string, periodStart: string, periodEnd: string) {
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, code, name')
    .eq('org_id', orgId)
    .in('code', ['4900', '5000', '5100', '5200', '5900'])

  const { data: periodEntries } = await supabase
    .from('journal_entries')
    .select('id')
    .eq('org_id', orgId)
    .gte('entry_date', periodStart)
    .lte('entry_date', periodEnd)

  const entryIds = (periodEntries ?? []).map((e) => e.id)
  const accountIds = (accounts ?? []).map((a) => a.id)

  const { data: lines } =
    entryIds.length && accountIds.length
      ? await supabase
          .from('journal_lines')
          .select('account_id, debit, credit')
          .eq('org_id', orgId)
          .in('entry_id', entryIds)
          .in('account_id', accountIds)
      : { data: [] }

  const totals = new Map<string, number>()
  for (const l of lines ?? []) {
    totals.set(l.account_id, (totals.get(l.account_id) ?? 0) + Number(l.credit) - Number(l.debit))
  }

  const rows = (accounts ?? [])
    .map((a) => ({ code: a.code, name: a.name, amount: totals.get(a.id) ?? 0 }))
    .sort((a, b) => a.code.localeCompare(b.code))

  const commissionIncome = rows.find((r) => r.code === '4900')?.amount ?? 0
  const expenseRows = rows.filter((r) => r.code !== '4900').map((r) => ({ ...r, amount: -r.amount }))
  const totalExpenses = expenseRows.reduce((s, r) => s + r.amount, 0)

  return { commissionIncome, expenseRows, totalExpenses, netProfit: commissionIncome - totalExpenses }
}
