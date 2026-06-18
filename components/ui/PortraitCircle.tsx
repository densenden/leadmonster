import { PORTRAIT_CIRCLE_INNER, PORTRAIT_CIRCLE_WRAPPER } from '@/lib/styles/portrait-circle'

interface PortraitCircleProps {
  src: string
  alt: string
  /** Size + border classes on the outer clip circle, e.g. `h-16 w-16 border border-gray-200` */
  className?: string
  width?: number
  height?: number
  loading?: 'lazy' | 'eager'
}

export function PortraitCircle({
  src,
  alt,
  className = 'h-16 w-16',
  width,
  height,
  loading = 'lazy',
}: PortraitCircleProps) {
  return (
    <div className={`${PORTRAIT_CIRCLE_WRAPPER} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        className={PORTRAIT_CIRCLE_INNER}
      />
    </div>
  )
}
