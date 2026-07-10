// Trust signal bar — full-width Navy background with Gold value + white label pairs.
// Server Component. Collapses to a two-column grid on mobile.
import { InlineMarkdown } from '@/components/util/InlineMarkdown'

interface TrustItem {
  value: string
  label: string
}

interface TrustBarProps {
  items: TrustItem[]
}

export function TrustBar({ items }: TrustBarProps) {
  return (
    <section aria-label="Vertrauenssignale" lang="de" className="w-full bg-[#1a365d] py-8 md:py-[40px]">
      <ul
        role="list"
        className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 md:flex md:flex-row md:flex-wrap md:justify-center md:gap-16"
      >
        {items.map((item, i) => (
          <li key={i} role="listitem" className="text-center min-w-0 px-1">
            <div className="text-[#d4af37] text-base sm:text-lg md:text-2xl lg:text-3xl font-bold font-heading leading-snug break-words hyphens-auto">
              {item.value}
            </div>
            <div className="text-white text-xs sm:text-sm font-body mt-1 leading-snug break-words hyphens-auto">
              <InlineMarkdown linkClassName="underline decoration-white/40 hover:decoration-white">
                {item.label}
              </InlineMarkdown>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
