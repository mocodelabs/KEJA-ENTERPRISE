import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

type DB = SupabaseClient<Database>

export interface MessageProvider {
  send(to: string, body: string): Promise<{ success: boolean; error?: string }>
}

/** Default stub: logs to the server console instead of sending a real message. */
export class ConsoleProvider implements MessageProvider {
  constructor(private label = 'SMS') {}
  async send(to: string, body: string) {
    console.log(`[${this.label} stub → ${to}] ${body}`)
    return { success: true }
  }
}

/**
 * Africa's Talking integration point — configured per-org via
 * Settings → SMS Gateway (see lib/actions/integrations.ts).
 * Complete the fetch call below per https://developers.africastalking.com/docs/sms/sending
 */
export class AfricasTalkingProvider implements MessageProvider {
  constructor(
    private apiKey: string,
    private senderId?: string | null
  ) {}

  async send(to: string, body: string) {
    try {
      console.warn(`[AfricasTalkingProvider stub] would send to=${to} body="${body}"`)
      // TODO: wire the real Africa's Talking request here, e.g.:
      // const res = await fetch('https://api.africastalking.com/version1/messaging', {
      //   method: 'POST',
      //   headers: { apiKey: this.apiKey, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      //   body: new URLSearchParams({ to, message: body, from: this.senderId ?? '' }),
      // })
      // if (!res.ok) return { success: false, error: `Africa's Talking error ${res.status}` }
      return { success: false, error: 'AfricasTalkingProvider is not wired up yet — see lib/services/messagingService.ts' }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown SMS error' }
    }
  }
}

/** Twilio SMS integration point — configured per-org via Settings → SMS Gateway. */
export class TwilioSmsProvider implements MessageProvider {
  constructor(
    private accountSid: string,
    private authToken: string,
    private fromNumber?: string | null
  ) {}

  async send(to: string, body: string) {
    console.warn(`[TwilioSmsProvider stub] would send to=${to} body="${body}"`)
    // TODO: wire the real Twilio request here, e.g.:
    // const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
    //   method: 'POST',
    //   headers: {
    //     Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
    //     'Content-Type': 'application/x-www-form-urlencoded',
    //   },
    //   body: new URLSearchParams({ To: to, From: this.fromNumber ?? '', Body: body }),
    // })
    return { success: false, error: 'TwilioSmsProvider is not wired up yet — see lib/services/messagingService.ts' }
  }
}

/** Generic custom SMS API integration point — configured per-org via Settings → SMS Gateway. */
export class CustomSmsProvider implements MessageProvider {
  constructor(
    private apiKey: string,
    private apiSecret?: string | null
  ) {}

  async send(to: string, body: string) {
    console.warn(`[CustomSmsProvider stub] would send to=${to} body="${body}"`)
    // TODO: wire your custom SMS API request here using this.apiKey / this.apiSecret
    return { success: false, error: 'CustomSmsProvider is not wired up yet — see lib/services/messagingService.ts' }
  }
}

/** WhatsApp Cloud API (Meta) integration point — configured per-org via Settings → WhatsApp Gateway. */
export class WhatsappCloudApiProvider implements MessageProvider {
  constructor(
    private phoneNumberId: string,
    private accessToken: string
  ) {}

  async send(to: string, body: string) {
    console.warn(`[WhatsappCloudApiProvider stub] would send to=${to} body="${body}"`)
    // TODO: wire the real WhatsApp Cloud API request here, e.g.:
    // const res = await fetch(`https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`, {
    //   method: 'POST',
    //   headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
    // })
    return { success: false, error: 'WhatsappCloudApiProvider is not wired up yet — see lib/services/messagingService.ts' }
  }
}

/** Twilio for WhatsApp integration point — configured per-org via Settings → WhatsApp Gateway. */
export class TwilioWhatsappProvider implements MessageProvider {
  constructor(
    private fromNumber: string,
    private accessToken: string
  ) {}

  async send(to: string, body: string) {
    console.warn(`[TwilioWhatsappProvider stub] would send to=${to} body="${body}"`)
    // TODO: wire the real Twilio WhatsApp request here (whatsapp: prefix on To/From numbers).
    return { success: false, error: 'TwilioWhatsappProvider is not wired up yet — see lib/services/messagingService.ts' }
  }
}

/** Generic custom WhatsApp Business API integration point. */
export class CustomWhatsappProvider implements MessageProvider {
  constructor(
    private phoneNumberId: string,
    private accessToken: string
  ) {}

  async send(to: string, body: string) {
    console.warn(`[CustomWhatsappProvider stub] would send to=${to} body="${body}"`)
    // TODO: wire your custom WhatsApp Business API request here
    return { success: false, error: 'CustomWhatsappProvider is not wired up yet — see lib/services/messagingService.ts' }
  }
}

export async function getSmsProvider(supabase: DB, orgId: string): Promise<MessageProvider> {
  const { data: settings } = await supabase
    .from('sms_gateway_settings')
    .select('provider, api_key, api_secret, sender_id')
    .eq('org_id', orgId)
    .maybeSingle()

  if (!settings || settings.provider === 'console') return new ConsoleProvider('SMS')

  switch (settings.provider) {
    case 'africastalking':
      if (!settings.api_key) return new ConsoleProvider('SMS')
      return new AfricasTalkingProvider(settings.api_key, settings.sender_id)
    case 'twilio':
      if (!settings.api_key || !settings.api_secret) return new ConsoleProvider('SMS')
      return new TwilioSmsProvider(settings.api_key, settings.api_secret, settings.sender_id)
    case 'custom':
      if (!settings.api_key) return new ConsoleProvider('SMS')
      return new CustomSmsProvider(settings.api_key, settings.api_secret)
    default:
      return new ConsoleProvider('SMS')
  }
}

export async function getWhatsappProvider(supabase: DB, orgId: string): Promise<MessageProvider> {
  const { data: settings } = await supabase
    .from('whatsapp_gateway_settings')
    .select('provider, phone_number_id, access_token')
    .eq('org_id', orgId)
    .maybeSingle()

  if (!settings || settings.provider === 'console') return new ConsoleProvider('WhatsApp')

  switch (settings.provider) {
    case 'whatsapp_cloud_api':
      if (!settings.phone_number_id || !settings.access_token) return new ConsoleProvider('WhatsApp')
      return new WhatsappCloudApiProvider(settings.phone_number_id, settings.access_token)
    case 'twilio_whatsapp':
      if (!settings.phone_number_id || !settings.access_token) return new ConsoleProvider('WhatsApp')
      return new TwilioWhatsappProvider(settings.phone_number_id, settings.access_token)
    case 'custom':
      if (!settings.phone_number_id || !settings.access_token) return new ConsoleProvider('WhatsApp')
      return new CustomWhatsappProvider(settings.phone_number_id, settings.access_token)
    default:
      return new ConsoleProvider('WhatsApp')
  }
}

export async function logMessage(
  supabase: DB,
  opts: {
    orgId: string
    tenantId?: string | null
    templateId?: string | null
    recipient: string
    body: string
    channel?: 'sms' | 'whatsapp'
    batchId?: string
  }
) {
  const channel = opts.channel ?? 'sms'

  const { data: logRow } = await supabase
    .from('messages_log')
    .insert({
      org_id: opts.orgId,
      tenant_id: opts.tenantId ?? null,
      template_id: opts.templateId ?? null,
      recipient: opts.recipient,
      body: opts.body,
      channel,
      status: 'queued',
      batch_id: opts.batchId ?? null,
    })
    .select()
    .single()

  const provider = channel === 'whatsapp' ? await getWhatsappProvider(supabase, opts.orgId) : await getSmsProvider(supabase, opts.orgId)
  const result = await provider.send(opts.recipient, opts.body)

  if (logRow) {
    await supabase
      .from('messages_log')
      .update({
        status: result.success ? 'sent' : 'failed',
        sent_at: result.success ? new Date().toISOString() : null,
      })
      .eq('id', logRow.id)
  }

  return result
}
