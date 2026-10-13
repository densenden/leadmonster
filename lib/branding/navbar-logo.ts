/** Resolve which navbar mark to show (pure — easy to test). */
export type NavbarLogoMark =
  | { kind: 'hidden' }
  | { kind: 'custom'; url: string; alt: string }
  | { kind: 'initial'; letter: string; accentColor: string }

/** First letter of the product name for the default circular avatar (e.g. Sterbegeld → S). */
export function productInitialLetter(name: string): string {
  const match = name.trim().match(/[A-Za-zÄÖÜäöüß]/)
  if (!match) return '?'
  return match[0].toLocaleUpperCase('de-DE')
}

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
  return {
    kind: 'initial',
    letter: productInitialLetter(args.productName),
    accentColor: args.accentColor,
  }
}
