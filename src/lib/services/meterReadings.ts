import type { Enums } from '@/lib/types/database'

/** Garbage is billed as a flat fee (previous_reading = 0, rate_per_unit = 1), not metered consumption. */
export function isFlatFeeMeterType(meterType: Enums<'meter_type'>) {
  return meterType === 'garbage'
}

type ReadingLike = {
  meter_type: Enums<'meter_type'>
  current_reading: number
  previous_reading: number
  rate_per_unit: number
}

export function meterReadingAmount(reading: ReadingLike) {
  const units = Number(reading.current_reading) - Number(reading.previous_reading)
  return Math.max(units, 0) * Number(reading.rate_per_unit)
}

export function meterReadingDescription(reading: ReadingLike) {
  if (isFlatFeeMeterType(reading.meter_type)) return 'Garbage collection fee'
  const units = Number(reading.current_reading) - Number(reading.previous_reading)
  return `${reading.meter_type} – ${units.toFixed(2)} units @ ${reading.rate_per_unit}`
}
