/** Values the live database accepts for looks, plus readable labels for every stylist value. */

export const LOOK_OCCASIONS = [
  'casual', 'corporate', 'date_night', 'formal', 'streetwear',
  'athleisure', 'brunch', 'vacation', 'wedding_guest', 'interview',
  'weekend', 'party', 'business_casual'
] as const

export const LOOK_SEASONS = ['spring', 'summer', 'fall', 'winter', 'all_season'] as const

const OVERRIDES: Record<string, string> = {
  all_season: 'All seasons',
  non_binary: 'Non-binary',
  wedding_guest: 'Wedding guest',
  quick_trip: 'Quick trip',
  special_occasion: 'Special occasion'
}

/** `date_night` → "Date night". Empty values show as a hyphen. */
export function stylistLabel(value: string | null | undefined): string {
  if (!value) return '-'
  if (OVERRIDES[value]) return OVERRIDES[value]
  const words = value.replace(/_/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export const LOOKBOOK_TYPES = ['quick_trip', 'special_occasion', 'conference', 'birthday', 'wedding', 'vacation', 'custom'] as const

export const LOOKBOOK_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'requested', label: 'Requested' },
  { value: 'accepted', label: 'In progress' },
  { value: 'completed', label: 'Completed' }
] as const

export function lookbookStatusLabel(status: string | null | undefined): string {
  return LOOKBOOK_STATUSES.find((s) => s.value === status)?.label ?? stylistLabel(status)
}
