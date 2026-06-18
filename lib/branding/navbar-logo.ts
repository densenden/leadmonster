/** Resolve which navbar mark to show (pure — easy to test). */
export type NavbarLogoMark =
  | { kind: 'hidden' }
  | { kind: 'custom'; url: string; alt: string }
  | { kind: 'monster'; accentColor: string }

export function resolveNavbarLogoMark(args: {
  visible: boolean
  customUrl?: string | null
  customAlt?: string | null
  productName: string
  accentColor: string
}): NavbarLogoMark {
  if (!args.visible) return { kind: 'hidden' }
  const url = args.customUrl?.trim()
  if (url) {
    return {
      kind: 'custom',
      url,
      alt: args.customAlt?.trim() || args.productName,
    }
  }
  return { kind: 'monster', accentColor: args.accentColor }
}
