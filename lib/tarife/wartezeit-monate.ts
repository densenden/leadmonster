/**
 * Extracts wartezeit_monate from besonderheiten JSON for DB upserts.
 * Falls back to 0 when missing — matches NOT NULL column default on tarife.
 */
export function wartezeitMonateFromBesonderheiten(
  besonderheiten: Record<string, unknown> | null | undefined,
): number {
  const raw = besonderheiten?.wartezeit_monate
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw)
    if (Number.isFinite(n)) return n
  }
  return 0
}
