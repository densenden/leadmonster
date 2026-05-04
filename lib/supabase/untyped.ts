/**
 * Helper für Tabellen, die im generierten Supabase-Type noch nicht enthalten
 * sind (z. B. neu hinzugefügte Tabellen via Migration vor `gen types`-Refresh).
 *
 * Nutzung:
 *   const sb = untyped(createAdminClient())
 *   const { data } = await sb.from('produkt_typen').select(...).eq(...).maybeSingle()
 *
 * Sobald `npx supabase gen types typescript` neu gelaufen ist, sollten diese
 * Stellen wieder auf den getypten Client umgestellt werden.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export function untyped(client: unknown): any {
  return client as any
}
