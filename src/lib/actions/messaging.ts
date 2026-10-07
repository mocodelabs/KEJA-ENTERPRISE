'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveOrg } from '@/lib/session'
import { logMessage } from '@/lib/services/messagingService'
import { renderTemplate } from '@/lib/services/templateTokens'
import type { AuthActionState } from '@/lib/actions/auth'
import type { Enums } from '@/lib/types/database'

export async function createTemplate(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()
  const name = String(formData.get('name') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  if (!name || !body) return { error: 'Name and message body are required.' }

  const { error } = await supabase.from('message_templates').insert({
    org_id: active.org_id,
    name,
    template_type: String(formData.get('template_type') ?? 'custom') as Enums<'template_type'>,
    body,
  })

  if (error) return { error: error.message }
  revalidatePath('/messaging/templates')
  return { message: 'Template saved.' }
}

export async function updateTemplate(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase } = await requireActiveOrg()
  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  if (!id) return { error: 'Missing template.' }
  if (!name || !body) return { error: 'Name and message body are required.' }

  const { error } = await supabase
    .from('message_templates')
    .update({
      name,
      template_type: String(formData.get('template_type') ?? 'custom') as Enums<'template_type'>,
      body,
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/messaging/templates')
  revalidatePath('/messaging/send')
  return { message: 'Template updated.' }
}

export async function deleteTemplate(id: string) {
  const { supabase } = await requireActiveOrg()
  const { error } = await supabase.from('message_templates').delete().eq('id', id)
  revalidatePath('/messaging/templates')
  if (error) return { error: error.message }
}

export async function sendToTenants(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()

  const recipientMode = String(formData.get('recipient_mode') ?? 'individual')
  const templateId = String(formData.get('template_id') ?? '')
  const messageBody = String(formData.get('message_body') ?? '')
  const channel = String(formData.get('channel') ?? 'sms') === 'whatsapp' ? 'whatsapp' : 'sms'

  let tenantIds: string[]

  if (recipientMode === 'property') {
    const propertyId = String(formData.get('property_id') ?? '')
    const blockId = String(formData.get('block_id') ?? '')
    if (!propertyId) return { error: 'Select a property.' }

    let unitsQuery = supabase.from('units').select('id').eq('property_id', propertyId)
    if (blockId) unitsQuery = unitsQuery.eq('block_id', blockId)
    const { data: units } = await unitsQuery
    const unitIds = (units ?? []).map((u) => u.id)

    if (unitIds.length === 0) return { error: 'No units found for that selection.' }

    const { data: leases } = await supabase
      .from('leases')
      .select('tenant_id')
      .in('unit_id', unitIds)
      .eq('status', 'active')

    tenantIds = Array.from(new Set((leases ?? []).map((l) => l.tenant_id)))
    if (tenantIds.length === 0) return { error: 'No active tenants found for that selection.' }
  } else {
    tenantIds = formData.getAll('tenant_ids').map(String)
  }

  if (tenantIds.length === 0) return { error: 'Select at least one tenant.' }
  if (!messageBody.trim()) return { error: 'Write a message, or pick a template to load one.' }

  const { data: tenants } = await supabase.from('tenants').select('*').in('id', tenantIds)

  const batchId =
    tenantIds.length > 1 ? crypto.randomUUID() : undefined

  let sent = 0
  for (const tenant of tenants ?? []) {
    const body = renderTemplate(messageBody, { tenant_name: tenant.full_name })

    const result = await logMessage(supabase, {
      orgId: active.org_id,
      tenantId: tenant.id,
      templateId: templateId || null,
      recipient: tenant.phone,
      body,
      channel,
      batchId,
    })
    if (result.success) sent++
  }

  revalidatePath('/messaging/send')
  return { message: `Sent to ${sent} of ${tenantIds.length} tenant(s) via ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}.` }
}
