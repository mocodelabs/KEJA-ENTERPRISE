import type { Enums } from '@/lib/types/database'

export const UNIT_TYPE_LABELS: Record<Enums<'unit_type'>, string> = {
  single_room: 'Single Room',
  double_room: 'Double Room',
  bedsitter: 'Bedsitter',
  one_bedroom: '1 Bedroom',
  two_bedroom: '2 Bedroom',
  three_bedroom: '3 Bedroom',
  four_bedroom_plus: '4+ Bedroom',
  studio: 'Studio',
  other: 'Other',
}

export const UNIT_TYPE_OPTIONS = Object.entries(UNIT_TYPE_LABELS) as [Enums<'unit_type'>, string][]

/** Typical bedroom count per unit type, used to auto-fill the Bedrooms field. */
export const UNIT_TYPE_BEDROOMS: Record<Enums<'unit_type'>, number | null> = {
  single_room: 0,
  double_room: 0,
  bedsitter: 0,
  one_bedroom: 1,
  two_bedroom: 2,
  three_bedroom: 3,
  four_bedroom_plus: 4,
  studio: 0,
  other: null,
}
