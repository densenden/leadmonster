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
    <section aria-label="Vertrauenssignale" className="w-full bg-[#1a365d] py-[40px]">
      <ul
        role="list"
        className="max-w-6xl mx-auto px-6 grid grid-cols-2 gap-8 sm:flex sm:flex-row sm:flex-wrap sm:justify-center sm:gap-16"
      >
        {items.map((item, i) => (
          <li key={i} role="listitem" className="text-center">
            <div className="text-[#d4af37] text-3xl font-bold font-heading">{item.value}</div>
            <div className="text-white text-sm font-body mt-1">
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
