// Insurer comparison table — Server Component, no interactivity required.
// Renders a horizontally scrollable accessible table with checkmark / dash icons.
// Each ROW is one insurer; each COLUMN is one criterion.
// Design tokens: Navy #1a365d header, Gold #d4af37 for checkmarks.

export interface AnbieterOffer {
  name: string
  wartezeit: string
  gesundheitsfragen: string
  garantierte_aufnahme: boolean
  beitrag_beispiel: string
  besonderheit: string
}

export interface VergleichProps {
  anbieter: AnbieterOffer[]
  produktName: string
  generatedAt: string
}

const CheckIcon = () => (
  <svg
    aria-label="Ja"
    role="img"
    className="w-5 h-5 inline-block"
    style={{ color: 'var(--accent, #d4af37)' }}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

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

const COLUMNS: { key: keyof AnbieterOffer; label: string }[] = [
  { key: 'wartezeit', label: 'Wartezeit' },
  { key: 'gesundheitsfragen', label: 'Gesundheitsfragen' },
  { key: 'garantierte_aufnahme', label: 'Garantierte Aufnahme' },
  { key: 'beitrag_beispiel', label: 'Beitrag ab' },
  { key: 'besonderheit', label: 'Besonderheit' },
]

export function Vergleich({ anbieter, produktName, generatedAt }: VergleichProps) {
  return (
    <div className="overflow-x-auto shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]">
      <table className="min-w-full table-auto">
        <caption className="sr-only">{produktName} — Anbietervergleich</caption>

        <thead>
          <tr className="bg-[#1a365d] text-white">
            <th scope="col" className="px-4 py-3 text-left text-sm font-medium">
              Anbieter
            </th>
            {COLUMNS.map(col => (
              <th
                key={col.key}
                scope="col"
                className="px-4 py-3 text-center text-sm font-medium min-w-[140px]"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {anbieter.map((a, rowIdx) => (
            <tr key={a.name} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <th scope="row" className="px-4 py-3 text-left text-sm font-semibold text-[#1a365d] whitespace-nowrap">
                {a.name}
              </th>
              {COLUMNS.map(col => {
                const value = a[col.key]
                return (
                  <td key={col.key} className="px-4 py-3 text-center">
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

      <p className="mt-2 text-sm text-gray-500 px-4 pb-3">
        Alle Angaben ohne Gewähr. Stand: {generatedAt}.
      </p>
    </div>
  )
}
