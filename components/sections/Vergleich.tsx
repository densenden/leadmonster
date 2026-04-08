// Insurer comparison table — Server Component, no interactivity required.
// Renders a horizontally scrollable accessible table with checkmark / dash icons.
// Design tokens: Navy #1a365d header, Gold #d4af37 for checkmarks.

/** Props for the Vergleich comparison table component. */
export interface VergleichProps {
  /** Ordered list of insurer names — each becomes a column header. */
  anbieter: string[]
  /** Comparison rows — each has a label and a value per insurer (boolean or string). */
  criteria: Array<{ label: string; values: Record<string, string | boolean> }>
  /** Used for the screen-reader table caption. */
  produktName: string
  /** Pre-formatted date string (DD.MM.YYYY) shown in the disclaimer line. */
  generatedAt: string
}

// Inline SVG checkmark — aria-label="Ja" for screen readers.
// Gold colour (#d4af37) communicates a positive / available feature.
const CheckIcon = () => (
  <svg
    aria-label="Ja"
    role="img"
    className="text-[#d4af37] w-5 h-5 inline-block"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

// Inline SVG dash — aria-label="Nein" for screen readers.
// Muted grey communicates a feature that is not available or not applicable.
const MinusIcon = () => (
  <svg
    aria-label="Nein"
    role="img"
    className="text-gray-400 w-5 h-5 inline-block"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
  </svg>
)

/** Comparison table for insurer products.
 *  Each row is one criterion; each column is one insurer.
 *  Boolean values display as SVG icons; string values display as plain text. */
export function Vergleich({ anbieter, criteria, produktName, generatedAt }: VergleichProps) {
  return (
    <div className="overflow-x-auto rounded-xl shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]">
      <table className="min-w-full table-auto">
        {/* Screen-reader caption describing the table purpose */}
        <caption className="sr-only">{produktName} — Anbietervergleich</caption>

        <thead>
          <tr className="bg-[#1a365d] text-white">
            {/* First column header — describes the row labels */}
            <th scope="col" className="px-4 py-3 text-left text-sm font-medium">
              Kriterium
            </th>
            {/* One column header per insurer */}
            {anbieter.map(name => (
              <th
                key={name}
                scope="col"
                className="px-4 py-3 text-center text-sm font-medium min-w-[140px]"
              >
                {name}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {criteria.map((criterion, rowIdx) => (
            <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {/* Row header — criterion label */}
              <th scope="row" className="px-4 py-3 text-left text-sm font-medium text-[#333333]">
                {criterion.label}
              </th>
              {/* One data cell per insurer for this criterion */}
              {anbieter.map(name => {
                const value = criterion.values[name]
                return (
                  <td key={name} className="px-4 py-3 text-center">
                    {typeof value === 'boolean' ? (
                      value ? <CheckIcon /> : <MinusIcon />
                    ) : (
                      <span className="text-sm text-[#666666]">{value}</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Disclaimer shown below the table inside the scroll container */}
      <p className="mt-2 text-sm text-gray-500 px-4 pb-3">
        Alle Angaben ohne Gewähr. Stand: {generatedAt}.
      </p>
    </div>
  )
}
