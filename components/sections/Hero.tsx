// Full-width hero section for public product landing pages.
// `inviting` variant: flyer layout with price badge + benefits (Sterbegeld).
// `classic` variant: image background with headline + CTA (other products).
import { InlineMarkdown } from '@/components/util/InlineMarkdown'

interface HeroProps {
  headline: string
  headline_accent?: string
  subline: string
  cta_text: string
  cta_anchor: string
  image_url?: string | null
  image_alt?: string | null
  variant?: 'classic' | 'inviting'
  price_from?: string
  benefits?: string[]
}

function CheckIcon() {
  return (
    <svg
      className="w-5 h-5 shrink-0 text-navy"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function stripMdLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}

function InvitingHero({
  headline,
  headline_accent,
  subline,
  cta_text,
  cta_anchor,
  image_url,
  image_alt,
  price_from,
  benefits = [],
}: HeroProps) {
  const ariaLabel = stripMdLinks([headline, headline_accent].filter(Boolean).join(' '))

  return (
    <section
      aria-label={ariaLabel}
      className="relative w-full overflow-hidden"
    >
      {image_url && (
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: `url('${image_url}')` }}
          role="img"
          aria-label={image_alt ?? ariaLabel}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-[#fff8f5]/95 via-[#fff0e8]/92 to-[#ffe4d6]/88" />

      <div className="relative max-w-content mx-auto px-4 sm:px-6 py-10 sm:py-14 md:py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl leading-tight mb-4 tracking-tight text-navy">
            <InlineMarkdown linkClassName="text-orange font-semibold hover:underline">
              {headline}
            </InlineMarkdown>
            {headline_accent && (
              <>
                {' '}
                <span className="text-orange">{headline_accent}</span>
              </>
            )}
          </h1>

          <p className="text-body text-base md:text-lg mb-6 font-body font-medium leading-relaxed">
            <InlineMarkdown linkClassName="text-orange font-semibold hover:underline">
              {subline}
            </InlineMarkdown>
          </p>

          {price_from && (
            <div className="inline-flex items-baseline gap-1.5 bg-orange text-white rounded-2xl px-6 py-3 mb-8 shadow-lg shadow-orange/25">
              <span className="font-body text-sm font-medium opacity-90">ab</span>
              <span className="font-heading text-3xl md:text-4xl font-bold leading-none">
                {price_from}
              </span>
              <span className="font-body text-sm font-medium opacity-90">pro Monat</span>
            </div>
          )}

          {benefits.length > 0 && (
            <ul className="text-left max-w-md mx-auto space-y-3 mb-8 font-body text-[15px] text-navy">
              {benefits.map(item => (
                <li key={item} className="flex items-start gap-3">
                  <CheckIcon />
                  <span className="font-medium leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          )}

          <a
            href={cta_anchor}
            className="inline-block bg-orange hover:bg-orange-dark text-white font-body font-bold text-base md:text-lg px-10 py-4 rounded-xl shadow-lg shadow-orange/30 hover:-translate-y-0.5 transition-all duration-200"
          >
            {cta_text}
          </a>
        </div>
      </div>
    </section>
  )
}

function ClassicHero({
  headline,
  headline_accent,
  subline,
  cta_text,
  cta_anchor,
  image_url,
}: HeroProps) {
  const ariaLabel = stripMdLinks(headline) + (headline_accent ? ` ${headline_accent}` : '')

  return (
    <section
      aria-label={ariaLabel}
      className={`relative w-full py-section-sm md:py-section lg:py-[120px] bg-cover bg-center ${image_url ? '' : 'bg-navy'}`}
      style={image_url ? { backgroundImage: `url('${image_url}')` } : undefined}
    >
      <div className="absolute inset-0 bg-navy/75" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h1 className="text-3xl sm:text-[2.25rem] md:text-4xl font-bold text-white font-heading mb-4 leading-tight">
          <InlineMarkdown linkClassName="underline decoration-white/40 underline-offset-4 hover:decoration-white">
            {headline}
          </InlineMarkdown>
          {headline_accent && (
            <>
              {' '}
              <span className="text-orange">{headline_accent}</span>
            </>
          )}
        </h1>
        <p className="text-white/90 text-lg mb-8 font-body font-medium">
          <InlineMarkdown linkClassName="underline decoration-white/40 underline-offset-2 hover:decoration-white">
            {subline}
          </InlineMarkdown>
        </p>
        <a
          href={cta_anchor}
          className="inline-block bg-orange hover:bg-orange-dark hover:-translate-y-0.5 text-white font-body font-bold px-8 py-3.5 rounded-xl transition-all duration-200 shadow-lg"
        >
          {cta_text}
        </a>
      </div>
    </section>
  )
}

export function Hero(props: HeroProps) {
  if (props.variant === 'inviting') {
    return <InvitingHero {...props} />
  }
  return <ClassicHero {...props} />
}
