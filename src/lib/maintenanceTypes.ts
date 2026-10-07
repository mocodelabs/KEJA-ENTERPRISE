import type { Enums } from '@/lib/types/database'

export const MAINTENANCE_ISSUE_LABELS: Record<Enums<'maintenance_issue_type'>, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  structural: 'Structural',
  appliance: 'Appliance',
  painting: 'Painting',
  pest_control: 'Pest control',
  other: 'Other',
}

export const MAINTENANCE_ISSUE_OPTIONS = Object.entries(MAINTENANCE_ISSUE_LABELS) as [
  Enums<'maintenance_issue_type'>,
  string,
][]
