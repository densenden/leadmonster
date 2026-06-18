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
