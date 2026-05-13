// Großer Stats-Block mit Headline + 3-4 Zahlen. Anders als TrustBar — heller
// Hintergrund, prominentere Typografie, optionaler Detailtext pro Kachel.
// Server Component.
import { InlineMarkdown } from '@/components/util/InlineMarkdown'

interface StatItem {
  value: string
  label: string
  detail?: string
}

interface StatsBlockProps {
  headline?: string
  subline?: string
  items: StatItem[]
}

export function StatsBlock({ headline, subline, items }: StatsBlockProps) {
  return (
    <section className="py-[70px] px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        {(headline || subline) && (
          <div className="text-center mb-12 max-w-2xl mx-auto">
            {headline && (
              <h2 className="text-2xl md:text-3xl font-bold text-[#1a365d] font-heading mb-3">
                <InlineMarkdown linkClassName="text-[#02a9e6] hover:underline">{headline}</InlineMarkdown>
              </h2>
            )}
            {subline && (
              <p className="text-[#4a5568] font-body">
                <InlineMarkdown linkClassName="text-[#02a9e6] hover:underline">{subline}</InlineMarkdown>
              </p>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, i) => (
            <div
              key={i}
              className="bg-[#f8f8f8] border-l-4 border-[#d4af37] p-6 rounded-r-xl"
            >
              <div className="text-4xl font-bold text-[#1a365d] font-heading leading-none mb-2">
                {item.value}
              </div>
              <div className="text-sm font-semibold text-[#1a365d] font-body mb-1">
                {item.label}
              </div>
              {item.detail && (
                <div className="text-xs text-[#666] font-body leading-relaxed">
                  <InlineMarkdown linkClassName="text-[#02a9e6] hover:underline">{item.detail}</InlineMarkdown>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
