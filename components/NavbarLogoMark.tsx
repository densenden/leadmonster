import { MonsterLogo } from '@/components/MonsterLogo'
import { resolveNavbarLogoMark } from '@/lib/branding/navbar-logo'

interface NavbarLogoMarkProps {
  visible: boolean
  customUrl?: string | null
  customAlt?: string | null
  accentColor: string
  productName: string
}

/** Logo slot left of the product name in ProduktChrome header. */
export function NavbarLogoMark({
  visible,
  customUrl,
  customAlt,
  accentColor,
  productName,
}: NavbarLogoMarkProps) {
  const mark = resolveNavbarLogoMark({
    visible,
    customUrl,
    customAlt,
    productName,
    accentColor,
  })

  if (mark.kind === 'hidden') return null

  if (mark.kind === 'custom') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={mark.url}
        alt={mark.alt}
        className="h-[38px] w-auto max-w-[140px] object-contain shrink-0"
      />
    )
  }

  return <MonsterLogo color={mark.accentColor} size={38} />
}
