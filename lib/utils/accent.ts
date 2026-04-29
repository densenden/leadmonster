// Default accent colors keyed by product type.
// Used when no explicit accent_color is set on the produkte row.
// Aligned with finanzteam26.de brand palette
export const ACCENT_DEFAULTS: Record<string, string> = {
  sterbegeld: '#f26522',   // orange — authority, tradition
  pflege:     '#02a9e6',   // cyan — care, clarity
  leben:      '#1a3252',   // navy — security, stability
  unfall:     '#d4511a',   // deep orange — urgency, protection
}

// Returns the resolved accent color: explicit override > type default > brand cyan.
export function resolveAccentColor(typ: string, override?: string | null): string {
  return override ?? ACCENT_DEFAULTS[typ] ?? '#02a9e6'
}

// Returns a slightly darkened version of the accent color for hover states.
// Simple approach: use CSS `filter: brightness(0.85)` at the component level instead.
export function accentHoverStyle(color: string): React.CSSProperties {
  return { backgroundColor: color, filter: 'brightness(0.88)' }
}
