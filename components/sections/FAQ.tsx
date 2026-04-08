'use client'

// FAQ accordion component — renders question/answer pairs as native <details>/<summary> elements.
// Uses design tokens: Nunito Sans body, Roboto heading, #333333/#666666 text, #e5e5e5 border.
// Animation: 250ms cubic-bezier open/close; disabled under prefers-reduced-motion.

/** Shape of a single FAQ question/answer pair — exported for page-level type use. */
export interface FAQItem {
  frage: string
  antwort: string
}

interface FAQProps {
  items: FAQItem[]
  className?: string
}

// Accordion section displaying FAQ items with accessible native details/summary markup.
// All text is rendered verbatim — no Markdown parsing, no framing copy added.
export function FAQ({ items, className = '' }: FAQProps) {
  return (
    <section
      aria-label="Häufige Fragen"
      className={`py-[70px] bg-[#f8f8f8] ${className}`}
    >
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="space-y-3">
          {items.map((item, i) => (
            <details
              key={i}
              className="group bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,.08)] border border-[#e5e5e5] overflow-hidden"
            >
              <summary className="flex items-center justify-between px-6 py-4 cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#abd5f4] list-none">
                <h3 className="font-heading font-bold text-[#333333] text-[1.375rem] leading-snug text-left">
                  {item.frage}
                </h3>
                {/* Chevron rotates 180deg when the <details> is open via group-open; transition disabled for prefers-reduced-motion */}
                <span
                  className="ml-4 shrink-0 text-[#1a365d] transition-transform duration-[250ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-open:rotate-180 motion-reduce:transition-none"
                  aria-hidden="true"
                >
                  ▼
                </span>
              </summary>
              {/* Answer panel — height animates via CSS transition on the details element; motion-reduce disables it */}
              <div className="px-6 pb-5 pt-1 transition-all duration-[250ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] motion-reduce:transition-none">
                <p className="font-body font-light text-[#666666] leading-relaxed">
                  {item.antwort}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
