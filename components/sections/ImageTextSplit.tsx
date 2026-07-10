// Bild + Text nebeneinander. Visueller Rhythmus zwischen klassischen Sektionen.
// Server Component — kein 'use client'.
import { renderMarkdown } from '@/lib/markdown/render'
import { InlineMarkdown } from '@/components/util/InlineMarkdown'

interface ImageTextSplitProps {
  image_url: string
  image_alt: string
  image_side?: 'left' | 'right'
  eyebrow?: string
  headline: string
  body: string
  cta_label?: string
  cta_href?: string
  background?: 'white' | 'soft' | 'navy'
}

export function ImageTextSplit({
  image_url,
  image_alt,
  image_side = 'left',
  eyebrow,
  headline,
  body,
  cta_label,
  cta_href,
  background = 'white',
}: ImageTextSplitProps) {
  const bgClass =
    background === 'navy'
      ? 'bg-[#1a365d] text-white'
      : background === 'soft'
      ? 'bg-[#f8f8f8] text-[#1a365d]'
      : 'bg-white text-[#1a365d]'

  const textClass = background === 'navy' ? 'text-white/90' : 'text-[#4a5568]'
  const eyebrowClass = background === 'navy' ? 'text-[#d4af37]' : 'text-[#02a9e6]'
  const headingClass = background === 'navy' ? 'text-white' : 'text-[#1a365d]'

  return (
    <section className={`${bgClass} py-section-sm md:py-section px-4 sm:px-6`}>
      <div
        className={`max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 items-center ${
          image_side === 'right' ? 'md:[&>div:first-child]:order-2' : ''
        }`}
      >
        <div className="md:col-span-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image_url}
            alt={image_alt}
            className="w-full aspect-[4/3] object-cover rounded-xl shadow-md"
            loading="lazy"
          />
        </div>
        <div className="md:col-span-6">
          {eyebrow && (
            <p className={`text-xs uppercase tracking-widest font-semibold mb-3 ${eyebrowClass}`}>
              {eyebrow}
            </p>
          )}
          <h2 className={`text-2xl md:text-3xl font-bold font-heading leading-tight mb-4 ${headingClass}`}>
            <InlineMarkdown linkClassName="underline decoration-current/30 hover:decoration-current">
              {headline}
            </InlineMarkdown>
          </h2>
          <div className={`prose max-w-none font-body text-base leading-relaxed ${textClass}`}>
            {renderMarkdown(body)}
          </div>
          {cta_label && cta_href && (
            <a
              href={cta_href}
              className={`inline-block mt-6 font-body font-semibold px-6 py-3 transition-all duration-150 hover:-translate-y-0.5 ${
                background === 'navy'
                  ? 'bg-[#d4af37] hover:bg-[#b8860b] text-white'
                  : 'bg-[#1a365d] hover:bg-[#0f2647] text-white'
              }`}
            >
              {cta_label}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
