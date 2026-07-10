// 3-5 Prozess-Schritte als horizontale Zeitleiste mit Nummerierung.
// Server Component. Auf Mobile vertikal mit Connector-Linie.
import { InlineMarkdown } from '@/components/util/InlineMarkdown'

interface StepItem {
  number: number
  title: string
  description: string
}

interface ProcessStepsProps {
  headline: string
  subline?: string
  items: StepItem[]
}

export function ProcessSteps({ headline, subline, items }: ProcessStepsProps) {
  return (
    <section className="py-section-sm md:py-section px-4 sm:px-6 bg-[#f8f8f8]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1a365d] font-heading mb-3">
            <InlineMarkdown linkClassName="text-[#02a9e6] hover:underline">{headline}</InlineMarkdown>
          </h2>
          {subline && (
            <p className="text-[#4a5568] font-body">
              <InlineMarkdown linkClassName="text-[#02a9e6] hover:underline">{subline}</InlineMarkdown>
            </p>
          )}
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {items.map((item, i) => (
            <li key={i} className="relative bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,.06)]">
              <div
                aria-hidden="true"
                className="absolute -top-4 left-6 w-10 h-10 rounded-full bg-[#1a365d] text-[#d4af37] font-bold flex items-center justify-center font-heading text-lg"
              >
                {item.number}
              </div>
              <p className="font-bold text-[#1a365d] font-heading mt-3 mb-2 text-base">
                {item.title}
              </p>
              <p className="text-sm text-[#4a5568] font-body leading-relaxed">
                <InlineMarkdown linkClassName="text-[#02a9e6] hover:underline">{item.description}</InlineMarkdown>
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
