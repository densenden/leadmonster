import { getAnbieterLogoSrc } from '@/lib/anbieter/logos'

interface AnbieterLogoProps {
  anbieterName: string
  className?: string
  testId?: string
}

/** Tiny provider logo in a white box — used under tariff names in comparison tables. */
export function AnbieterLogo({ anbieterName, className = '', testId }: AnbieterLogoProps) {
  const src = getAnbieterLogoSrc(anbieterName)
  if (!src) return null

  return (
    <div
      className={`mt-1 inline-flex items-center justify-center bg-white rounded-sm px-1 py-0.5 ${className}`.trim()}
      data-testid={testId}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="h-2.5 w-auto max-w-[52px] object-contain"
        loading="lazy"
        decoding="async"
      />
    </div>
  )
}
