// Feature grid section showing product advantages as cards.
// Server Component — no interactive behaviour required.

// Map of known icon keys to Unicode symbols.
// Unknown icon values render nothing (no error thrown).
const ICONS: Record<string, string> = {
  shield: '🛡',
  check: '✓',
  star: '★',
  clock: '⏱',
  heart: '♥',
  euro: '€',
}

interface FeatureItem {
  icon: string
  title: string
  text: string
}

interface FeatureGridProps {
  items: FeatureItem[]
}

export function FeatureGrid({ items }: FeatureGridProps) {
  return (
    <section aria-label="Produktvorteile" className="py-[70px] px-6 bg-white">
      <div className="max-w-6xl mx-auto grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8">
        {items.map((item, i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,.08)] p-6 border-b-4 border-transparent hover:border-[#d4af37] transition-colors duration-150"
          >
            {ICONS[item.icon] && (
              <span className="text-2xl mb-3 block" aria-hidden="true">
                {ICONS[item.icon]}
              </span>
            )}
            <h3 className="font-bold text-[#1a365d] mb-2 font-heading">{item.title}</h3>
            <p className="text-[#4a5568] font-body text-sm">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
