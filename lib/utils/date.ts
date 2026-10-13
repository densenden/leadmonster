// Date formatting utilities shared across admin pages.

import type { GenerierterContent } from '@/lib/supabase/types'

// Formats an ISO date string into German locale format: DD.MM.YYYY HH:mm.
// Used for displaying generated_at and published_at timestamps in the admin UI.
export function formatGermanDateTime(isoString: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString))
}

/**
 * Keep only digits and insert German dots while the user types.
 * Example: "15051960" → "15.05.1960"
 */
export function formatGermanBirthdateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`
}

/**
 * Parse a German birthdate (TT.MM.JJJJ) into ISO YYYY-MM-DD.
 * Returns null if the day/month/year is not a real calendar date.
 */
export function parseGermanBirthdateToIso(value: string): string | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim())
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  // Local noon avoids timezone edge-cases around midnight.
  const date = new Date(year, month - 1, day, 12, 0, 0, 0)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

/** Admin label for publication state — driven by `status`, not `published_at` alone. */
export function formatPublicationStatusLabel(
  status: GenerierterContent['status'],
  publishedAt: string | null,
): string {
  if (status === 'publiziert') {
    return publishedAt
      ? `Veröffentlicht am: ${formatGermanDateTime(publishedAt)}`
      : 'Veröffentlicht (Datum fehlt)'
  }
  if (status === 'review') {
    return 'In Review — noch nicht veröffentlicht'
  }
  return 'Noch nicht veröffentlicht'
}
