'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveOrg } from '@/lib/session'
import { validateDocumentUpload, sanitizeFilename } from '@/lib/fileUploads'
import { isDemoUser } from '@/lib/demo'
import type { AuthActionState } from '@/lib/actions/auth'

export async function createTenant(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, user, active } = await requireActiveOrg()

  const fullName = String(formData.get('full_name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  if (!fullName || !phone) return { error: 'Name and phone are required.' }

  const unitId = String(formData.get('unit_id') ?? '')
  const startDate = String(formData.get('start_date') ?? '')
  const rentAmount = Number(formData.get('rent_amount') ?? 0)
  if (!unitId || !startDate || rentAmount <= 0) {
    return { error: 'Every tenant must be pegged to a lease — select a unit, start date, and rent.' }
  }

  const contractUpload = validateDocumentUpload(formData.get('contract'), {
    uploadsDisabled: isDemoUser(user.email),
  })
  if (contractUpload.error) return { error: contractUpload.error }
  const contractFile = contractUpload.file

  const { data: tenant, error } = await supabase
    .from('tenants')
    .insert({
      org_id: active.org_id,
      full_name: fullName,
      phone,
      email: String(formData.get('email') ?? '') || null,
      id_number: String(formData.get('id_number') ?? '') || null,
      emergency_contact: String(formData.get('emergency_contact') ?? '') || null,
    })
    .select()
    .single()

  if (error || !tenant) return { error: error?.message ?? 'Could not create tenant.' }

  const { data: lease, error: leaseError } = await supabase
    .from('leases')
    .insert({
      org_id: active.org_id,
      unit_id: unitId,
      tenant_id: tenant.id,
      start_date: startDate,
      rent_amount: rentAmount,
      deposit_amount: Number(formData.get('deposit_amount') ?? 0),
      billing_day: Number(formData.get('billing_day') ?? 1),
      status: 'active',
    })
    .select('id')
    .single()

  if (leaseError || !lease) return { error: `Tenant created, but failed to create lease: ${leaseError?.message}` }

  await supabase.from('units').update({ status: 'occupied' }).eq('id', unitId)

  if (contractFile) {
    const path = `${active.org_id}/${lease.id}/${Date.now()}-${sanitizeFilename(contractFile.name)}`
    const { error: uploadError } = await supabase.storage
      .from('lease-contracts')
      .upload(path, contractFile, { contentType: contractFile.type, upsert: false })

    if (uploadError) {
      revalidatePath('/tenants')
      revalidatePath('/leases')
      revalidatePath('/properties')
      return { message: `Tenant and lease created, but the contract failed to upload: ${uploadError.message}` }
    }

    await supabase.from('leases').update({ contract_url: path }).eq('id', lease.id)
  }

  revalidatePath('/tenants')
  revalidatePath('/leases')
  revalidatePath('/properties')
  return { message: 'Tenant added and lease created — unit marked occupied.' }
}

export async function deleteTenant(id: string) {
  const { supabase } = await requireActiveOrg()
  const { error } = await supabase.from('tenants').delete().eq('id', id)
  revalidatePath('/tenants')
  if (error) return { error: error.message }
}
