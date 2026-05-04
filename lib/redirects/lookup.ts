// Redirect-Lookup für die Edge-Middleware.
// Hält ein Module-Scope-Cache mit 60s TTL pro Worker-Instanz — Admin-Saves
// werden nach maximal einer Minute auf allen warmen Workern sichtbar.
// Read-only, Edge-runtime-kompatibel.
import type { SupabaseClient } from '@supabase/supabase-js'

interface RedirectEntry {
  target: string
  status: number
}

// Modul-Cache. Wird beim ersten Zugriff (oder nach Ablauf) befüllt.
let cache: Map<string, RedirectEntry> | null = null
let loadedAt = 0
const TTL_MS = 60_000

/** Manueller Reset — für Tests oder Admin-Aktionen, die unmittelbar wirken sollen. */
export function resetRedirectCache(): void {
  cache = null
  loadedAt = 0
}

/**
 * Liefert eine Redirect-Regel für `pathname` (mit führendem `/`) oder `null`,
 * wenn keine matched. Akzeptiert auch Pfade mit Trailing-Slash und matcht
 * gegen die kanonische Form.
 */
export async function lookupRedirect(
  supabase: SupabaseClient,
  pathname: string,
): Promise<RedirectEntry | null> {
  if (!cache || Date.now() - loadedAt > TTL_MS) {
    const { data } = await supabase
      .from('redirects')
      .select('legacy_path, target_path, status')
    cache = new Map(
      (data ?? []).map((r: { legacy_path: string; target_path: string; status: number }) => [
        r.legacy_path,
        { target: r.target_path, status: r.status },
      ]),
    )
    loadedAt = Date.now()
  }

  // Exakter Match
  const direct = cache.get(pathname)
  if (direct) return direct

  // Trailing-Slash-Toleranz: '/foo' und '/foo/' werden gleich behandelt.
  if (pathname.endsWith('/') && pathname.length > 1) {
    const stripped = pathname.replace(/\/+$/, '')
    const m = cache.get(stripped)
    if (m) return m
  } else {
    const withSlash = `${pathname}/`
    const m = cache.get(withSlash)
    if (m) return m
  }

  return null
}
