import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

type DB = SupabaseClient<Database>

/** Builds a draft payroll run with one line item per active employee. */
export async function createPayrollRunForActiveEmployees(
  supabase: DB,
  orgId: string,
  periodStart: string,
  periodEnd: string
) {
  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'active')

  if (!employees || employees.length === 0) {
    return { error: 'No active employees to run payroll for.' }
  }

  const { data: run, error } = await supabase
    .from('payroll_runs')
    .insert({ org_id: orgId, period_start: periodStart, period_end: periodEnd, status: 'draft' })
    .select()
    .single()

  if (error || !run) return { error: error?.message ?? 'Could not create payroll run.' }

  let totalNet = 0
  for (const emp of employees) {
    const gross = Number(emp.salary)
    const net = gross // statutory deductions are not modeled in this pass; add as needed
    totalNet += net
    await supabase.from('payroll_items').insert({
      org_id: orgId,
      payroll_run_id: run.id,
      employee_id: emp.id,
      gross_amount: gross,
      deductions: 0,
      net_amount: net,
    })
  }

  await supabase.from('payroll_runs').update({ total_net: totalNet }).eq('id', run.id)

  return { runId: run.id, totalNet, employeeCount: employees.length }
}
