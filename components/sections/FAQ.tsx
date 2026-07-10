'use client'

// FAQ accordion component — renders question/answer pairs as native <details>/<summary> elements.
// Uses design tokens: Nunito Sans body, Roboto heading, #333333/#666666 text, #e5e5e5 border.
// Animation: 250ms cubic-bezier open/close; disabled under prefers-reduced-motion.
import { InlineMarkdown } from '@/components/util/InlineMarkdown'

/** Shape of a single FAQ question/answer pair — exported for page-level type use. */
export interface FAQItem {
  frage: string
  antwort: string
}

interface FAQProps {
  items: FAQItem[]
  className?: string
  /** When true, renders only the accordion list (no outer section/padding). */
  embedded?: boolean
}

function FaqAccordionList({ items }: { items: FAQItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <details
          key={i}
          className="group bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,.08)] border border-[#e5e5e5] overflow-hidden"
        >
          <summary className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#abd5f4] list-none">
            <h3 className="flex-1 min-w-0 font-heading font-bold text-[#333333] text-lg sm:text-[1.375rem] leading-snug text-left">
              <InlineMarkdown linkClassName="text-[#02a9e6] hover:underline">
                {item.frage}
              </InlineMarkdown>
            </h3>
            <span
              className="shrink-0 text-[#1a365d] transition-transform duration-[250ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-open:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            >
              ▼
            </span>
          </summary>
          <div className="px-4 sm:px-6 pb-5 pt-1 transition-all duration-[250ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] motion-reduce:transition-none">
            <p className="font-body font-light text-[#666666] leading-relaxed">
              <InlineMarkdown linkClassName="text-[#02a9e6] hover:underline">
                {item.antwort}
              </InlineMarkdown>
            </p>
          </div>
        </details>
      ))}
    </div>
  )
}

// Accordion section displaying FAQ items with accessible native details/summary markup.
// All text is rendered verbatim — no Markdown parsing, no framing copy added.
export function FAQ({ items, className = '', embedded = false }: FAQProps) {
  if (embedded) {
    return (
      <div className={className}>
        <FaqAccordionList items={items} />
      </div>
    )
  }

  return (
    <section
      aria-label="Häufige Fragen"
      className={`py-section-sm md:py-section bg-[#f8f8f8] ${className}`}
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <FaqAccordionList items={items} />
      </div>
    </section>
  )
}
