// Full-width hero section for public product landing pages.
// Server Component — no client-side JS required. CTA is a plain anchor scroll.
import { InlineMarkdown } from '@/components/util/InlineMarkdown'

interface HeroProps {
  headline: string
  subline: string
  cta_text: string
  cta_anchor: string
  image_url?: string | null
  image_alt?: string | null
}

export function Hero({
  headline,
  subline,
  cta_text,
  cta_anchor,
  image_url,
}: HeroProps) {
  // aria-label needs a clean string — strip markdown link syntax.
  const ariaLabel = headline.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  const bgUrl = image_url ?? '/images/hero-bg.jpg'
  return (
    <section
      aria-label={ariaLabel}
      className="relative w-full py-[70px] md:py-[140px] bg-cover bg-center"
      style={{ backgroundImage: `url('${bgUrl}')` }}
    >
      {/* Navy overlay at 70% opacity */}
      <div className="absolute inset-0 bg-[#1a365d]/70" />
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <h1 className="text-[2.5rem] md:text-4xl font-bold text-white font-heading mb-4">
          <InlineMarkdown linkClassName="underline decoration-white/40 underline-offset-4 hover:decoration-white">
            {headline}
          </InlineMarkdown>
        </h1>
        <p className="text-white/90 text-lg mb-8 font-body">
          <InlineMarkdown linkClassName="underline decoration-white/40 underline-offset-2 hover:decoration-white">
            {subline}
          </InlineMarkdown>
        </p>
        <a
          href={cta_anchor}
          className="inline-block bg-[#d4af37] hover:bg-[#b8860b] hover:-translate-y-0.5 text-white font-body font-semibold px-8 py-3 transition-all duration-150"
        >
          {cta_text}
        </a>
      </div>
    </section>
  )
}
