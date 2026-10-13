/**
 * Cheap shape-check for public /[produkt] params.
 * Real products use the same rule as produktSchema.slug (lib/validations/produkt.ts).
 * Junk like /.env, /wp.php, /favicon.ico must NOT hit Supabase — that triggers
 * Next.js "static → dynamic" 500s because createAdminClient uses cache: 'no-store'.
 */
const PRODUKT_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$|^[a-z0-9]{1,2}$/

export function isValidProduktSlug(slug: string | null | undefined): boolean {
  if (!slug || typeof slug !== 'string') return false
  // Reject hidden/dotfiles and anything with a file extension feel.
  if (slug.startsWith('.') || slug.includes('.')) return false
  if (slug.length < 1 || slug.length > 80) return false
  return PRODUKT_SLUG_RE.test(slug)
}

/**
 * Paths bots probe for secrets / PHP shells. Middleware returns a hard 404
 * so the request never reaches the ISR product page.
 */
export function isProbePath(pathname: string): boolean {
  if (!pathname || pathname === '/') return false
  // /.env, /.git/config, /foo/.env.bak
  if (pathname.includes('/.') || pathname.startsWith('/.')) return true
  // Common vuln / CMS scanners
  if (
    /\.(php|asp|aspx|cgi|env|bak|old|sql|git|svn|ini|conf|backup|local)(\/|$)/i.test(
      pathname,
    )
  ) {
    return true
  }
  return false
}
