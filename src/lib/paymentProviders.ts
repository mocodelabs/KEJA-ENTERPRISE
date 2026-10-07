import type { Enums } from '@/lib/types/database'
import { maskSecret } from '@/lib/secrets'

export type PaymentProviderField = {
  key: string
  label: string
  secret?: boolean
  placeholder?: string
}

export type PaymentProviderMeta = {
  value: Enums<'payment_provider'>
  label: string
  /** false = tenants just pay manually to these details, no API integration needed. */
  needsApiKeys: boolean
  description: string
  fields: PaymentProviderField[]
}

export const PAYMENT_PROVIDERS: PaymentProviderMeta[] = [
  {
    value: 'bank_account',
    label: 'Bank Account',
    needsApiKeys: false,
    description: 'Show tenants your bank details for direct bank transfers. No API keys needed.',
    fields: [
      { key: 'bank_name', label: 'Bank name' },
      { key: 'account_name', label: 'Account name' },
      { key: 'account_number', label: 'Account number' },
      { key: 'branch', label: 'Branch (optional)' },
    ],
  },
  {
    value: 'mpesa_paybill',
    label: 'M-Pesa Paybill',
    needsApiKeys: false,
    description:
      'Tenants pay to your Paybill manually — works with just the number below. Add Daraja API keys too if you want automated STK Push or C2B registration later.',
    fields: [
      { key: 'paybill_number', label: 'Paybill number' },
      { key: 'account_note', label: 'Account number format', placeholder: 'e.g. tenant phone number' },
      { key: 'consumer_key', label: 'Daraja Consumer key (optional)', secret: true },
      { key: 'consumer_secret', label: 'Daraja Consumer secret (optional)', secret: true },
      { key: 'passkey', label: 'Daraja Passkey (optional)', secret: true },
      { key: 'environment', label: 'Daraja environment (optional)', placeholder: 'sandbox or production' },
    ],
  },
  {
    value: 'mpesa_till',
    label: 'M-Pesa Till (Buy Goods)',
    needsApiKeys: false,
    description:
      'Tenants pay to your Till number manually — works with just the number below. Add Daraja API keys too if you want automated STK Push or C2B registration later.',
    fields: [
      { key: 'till_number', label: 'Till number' },
      { key: 'consumer_key', label: 'Daraja Consumer key (optional)', secret: true },
      { key: 'consumer_secret', label: 'Daraja Consumer secret (optional)', secret: true },
      { key: 'passkey', label: 'Daraja Passkey (optional)', secret: true },
      { key: 'environment', label: 'Daraja environment (optional)', placeholder: 'sandbox or production' },
    ],
  },
  {
    value: 'kopokopo',
    label: 'KopoKopo',
    needsApiKeys: true,
    description: 'Connect your KopoKopo account for automated M-Pesa collection via API.',
    fields: [
      { key: 'till_number', label: 'Till number' },
      { key: 'client_id', label: 'Client ID', secret: true },
      { key: 'client_secret', label: 'Client secret', secret: true },
      { key: 'api_key', label: 'API key', secret: true },
    ],
  },
  {
    value: 'paypal',
    label: 'PayPal',
    needsApiKeys: true,
    description: 'For international tenants/owners paying via PayPal.',
    fields: [
      { key: 'client_id', label: 'Client ID', secret: true },
      { key: 'client_secret', label: 'Client secret', secret: true },
      { key: 'mode', label: 'Mode', placeholder: 'sandbox or live' },
    ],
  },
  {
    value: 'pesapal',
    label: 'Pesapal',
    needsApiKeys: true,
    description: 'Accept card, mobile money, and bank payments via Pesapal.',
    fields: [
      { key: 'consumer_key', label: 'Consumer key', secret: true },
      { key: 'consumer_secret', label: 'Consumer secret', secret: true },
    ],
  },
  {
    value: 'paystack',
    label: 'Paystack',
    needsApiKeys: true,
    description: 'Accept card and mobile money payments via Paystack.',
    fields: [
      { key: 'public_key', label: 'Public key' },
      { key: 'secret_key', label: 'Secret key', secret: true },
    ],
  },
]

export function getPaymentProviderMeta(provider: Enums<'payment_provider'>) {
  return PAYMENT_PROVIDERS.find((p) => p.value === provider)
}

/**
 * Splits a saved gateway config into plain display values and a
 * secrets-set flag — never returns the actual secret values, so this is
 * safe to pass down to a client component.
 */
export function summarizeGatewayConfig(provider: Enums<'payment_provider'>, config: Record<string, unknown>) {
  const meta = getPaymentProviderMeta(provider)
  const values: Record<string, string> = {}
  const secretsMasked: Record<string, string | null> = {}
  if (!meta) return { values, secretsMasked }

  for (const field of meta.fields) {
    const raw = config[field.key]
    if (field.secret) {
      secretsMasked[field.key] = typeof raw === 'string' ? maskSecret(raw) : null
    } else if (typeof raw === 'string') {
      values[field.key] = raw
    }
  }
  return { values, secretsMasked }
}
