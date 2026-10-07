'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveOrg } from '@/lib/session'
import { createPayrollRunForActiveEmployees } from '@/lib/services/payrollEngine'
import { validateDocumentUpload, sanitizeFilename } from '@/lib/fileUploads'
import type { AuthActionState } from '@/lib/actions/auth'

export async function createEmployee(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()
  const fullName = String(formData.get('full_name') ?? '').trim()
  const salary = Number(formData.get('salary') ?? 0)
  if (!fullName || salary <= 0) return { error: 'Name and a valid salary are required.' }

  const contractUpload = validateDocumentUpload(formData.get('contract'))
  if (contractUpload.error) return { error: contractUpload.error }
  const contractFile = contractUpload.file

  const { data: employee, error } = await supabase
    .from('employees')
    .insert({
      org_id: active.org_id,
      full_name: fullName,
      job_title: String(formData.get('job_title') ?? '') || null,
      email: String(formData.get('email') ?? '') || null,
      phone: String(formData.get('phone') ?? '') || null,
      salary,
      hire_date: String(formData.get('hire_date') ?? '') || null,
    })
    .select('id')
    .single()

  if (error || !employee) return { error: error?.message ?? 'Could not create employee.' }

  if (contractFile) {
    const path = `${active.org_id}/${employee.id}/${Date.now()}-${sanitizeFilename(contractFile.name)}`
    const { error: uploadError } = await supabase.storage
      .from('employee-contracts')
      .upload(path, contractFile, { contentType: contractFile.type, upsert: false })

    if (uploadError) {
      revalidatePath('/hr/employees')
      return { message: `Employee added, but the contract failed to upload: ${uploadError.message}` }
    }

    await supabase.from('employees').update({ contract_url: path }).eq('id', employee.id)
  }

  revalidatePath('/hr/employees')
  return { message: 'Employee added.' }
}

export async function updateEmployee(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()

  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Missing employee.' }

  const fullName = String(formData.get('full_name') ?? '').trim()
  const salary = Number(formData.get('salary') ?? 0)
  if (!fullName || salary <= 0) return { error: 'Name and a valid salary are required.' }

  const contractUpload = validateDocumentUpload(formData.get('contract'))
  if (contractUpload.error) return { error: contractUpload.error }
  const contractFile = contractUpload.file

  const { error } = await supabase
    .from('employees')
    .update({
      full_name: fullName,
      job_title: String(formData.get('job_title') ?? '') || null,
      email: String(formData.get('email') ?? '') || null,
      phone: String(formData.get('phone') ?? '') || null,
      salary,
      hire_date: String(formData.get('hire_date') ?? '') || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  if (contractFile) {
    const path = `${active.org_id}/${id}/${Date.now()}-${sanitizeFilename(contractFile.name)}`
    const { error: uploadError } = await supabase.storage
      .from('employee-contracts')
      .upload(path, contractFile, { contentType: contractFile.type, upsert: false })

    if (uploadError) {
      revalidatePath('/hr/employees')
      return { message: `Employee updated, but the contract failed to upload: ${uploadError.message}` }
    }

    await supabase.from('employees').update({ contract_url: path }).eq('id', id)
  }

  revalidatePath('/hr/employees')
  return { message: 'Employee updated.' }
}

export async function terminateEmployee(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase } = await requireActiveOrg()

  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Missing employee.' }

  const terminationDate = String(formData.get('termination_date') ?? '') || new Date().toISOString().slice(0, 10)

  const { error } = await supabase
    .from('employees')
    .update({
      status: 'terminated',
      termination_date: terminationDate,
      termination_reason: String(formData.get('termination_reason') ?? '') || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/hr/employees')
  return { message: 'Employee contract terminated.' }
}

export async function reinstateEmployee(id: string) {
  const { supabase } = await requireActiveOrg()
  const { error } = await supabase
    .from('employees')
    .update({ status: 'active', termination_date: null, termination_reason: null })
    .eq('id', id)
  revalidatePath('/hr/employees')
  if (error) return { error: error.message }
}

export async function deleteEmployee(id: string) {
  const { supabase } = await requireActiveOrg()
  const { error } = await supabase.from('employees').delete().eq('id', id)
  revalidatePath('/hr/employees')
  if (error) return { error: error.message }
}

export async function createPayrollRun(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()
  const periodStart = String(formData.get('period_start') ?? '')
  const periodEnd = String(formData.get('period_end') ?? '')
  if (!periodStart || !periodEnd) return { error: 'Period start and end are required.' }

  const result = await createPayrollRunForActiveEmployees(supabase, active.org_id, periodStart, periodEnd)
  if (result.error) return { error: result.error }

  revalidatePath('/hr/payroll')
  return { message: `Draft payroll run created for ${result.employeeCount} employee(s).` }
}

/** Approving a payroll run processes it immediately per the "auto-process on approval" requirement. */
export async function approveAndProcessPayrollRun(id: string) {
  const { supabase, user } = await requireActiveOrg()

  const { data: member } = await supabase.from('org_members').select('id').eq('user_id', user.id).single()

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('payroll_runs')
    .update({ status: 'processed', approved_by: member?.id, approved_at: now, processed_at: now })
    .eq('id', id)

  revalidatePath('/hr/payroll')
  if (error) return { error: error.message }
}
