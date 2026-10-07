/** Shows only the last 4 characters of a secret, for display after saving. */
export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null
  if (value.length <= 4) return '••••'
  return `••••${value.slice(-4)}`
}
