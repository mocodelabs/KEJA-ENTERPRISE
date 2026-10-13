/** Digits only — Kenyan National ID numbers are commonly 6-10 digits. */
export function isValidNationalId(value: string) {
  return /^\d{6,10}$/.test(value.trim())
}

export function normalizeKraPin(value: string) {
  return value.trim().toUpperCase()
}

/** KRA PIN format: one letter, nine digits, one letter (e.g. A012345678Z). */
export function isValidKraPin(value: string) {
  return /^[A-Z]\d{9}[A-Z]$/.test(normalizeKraPin(value))
}

/**
 * Both the National ID and KRA PIN are optional while the platform is in trial,
 * but a value that is provided must still be well-formed. Blank values come back as null.
 */
export function parseTaxIdentity(formData: FormData):
  | { error: string }
  | { error?: undefined; nationalId: string | null; kraPin: string | null } {
  const nationalId = String(formData.get('owner_national_id') ?? '').trim()
  const kraPin = normalizeKraPin(String(formData.get('owner_kra_pin') ?? ''))

  if (nationalId && !isValidNationalId(nationalId)) return { error: 'Enter a valid National ID (6-10 digits).' }
  if (kraPin && !isValidKraPin(kraPin)) return { error: 'Enter a valid KRA PIN (e.g. A012345678Z).' }

  return { nationalId: nationalId || null, kraPin: kraPin || null }
}
