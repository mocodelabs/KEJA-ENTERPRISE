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
