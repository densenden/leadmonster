// Lead-form GDPR helpers — privacy policy version + legal page URLs.

import { ROOT_PRODUKT_SLUG } from '@/lib/seo/organization'

/** Bump when DatenschutzBlocks content changes materially. */
export const PRIVACY_POLICY_VERSION = '2026-07-10'

/** Resolve product-scoped Datenschutz URL (root product uses top-level /datenschutz). */
export function resolveDatenschutzHref(produktSlug: string): string {
  return produktSlug === ROOT_PRODUKT_SLUG ? '/datenschutz' : `/${produktSlug}/datenschutz`
}
