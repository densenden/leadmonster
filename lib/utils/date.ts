// Date formatting utilities shared across admin pages.

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
