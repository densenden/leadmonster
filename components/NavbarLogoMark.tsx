import { resolveNavbarLogoMark, productInitialLetter } from '@/lib/branding/navbar-logo'

interface NavbarLogoMarkProps {
  visible: boolean
  customUrl?: string | null
  customAlt?: string | null
  accentColor: string
  productName: string
  /** Pixel size of the circle (header 38, footer 34). */
  size?: number
}

/** Circular product mark left of the product name (letter avatar or square upload). */
export function NavbarLogoMark({
  visible,
  customUrl,
  customAlt,
  accentColor,
  productName,
  size = 38,
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
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-heading font-bold text-white select-none"
      style={{
        width: size,
        height: size,
        backgroundColor: mark.accentColor,
        fontSize: Math.round(size * 0.45),
      }}
      aria-hidden="true"
      title={productName}
    >
      {mark.letter || productInitialLetter(productName)}
    </span>
  )
}
