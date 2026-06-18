// Bildnachweise — lists stock + AI images used on the site (imprint index).
import type { ImageCredit } from '@/lib/stock/types'

interface Props {
  credits: ImageCredit[]
}

export function ImageCreditsIndex({ credits }: Props) {
  if (credits.length === 0) return null

  const stock = credits.filter(c => c.provider === 'unsplash')
  const other = credits.filter(c => c.provider !== 'unsplash')

  return (
    <section className="mb-8" aria-labelledby="bildnachweise-heading">
      <h2 id="bildnachweise-heading" className="text-lg font-bold text-[#1a3252] mb-2">
        Bildnachweise
      </h2>
      <p className="text-sm text-[#4a5568] leading-relaxed mb-4">
        Auf dieser Website verwenden wir lizenzfreie Stock-Fotos von{' '}
        <a
          href="https://unsplash.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#02a9e6] hover:underline"
        >
          Unsplash
        </a>{' '}
        sowie eigene und KI-generierte Beitragsbilder. Nachfolgend die wichtigsten Quellen:
      </p>

      {stock.length > 0 && (
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 text-[#333]">
              <tr>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Verwendung</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Motiv</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Fotograf/in</th>
                <th className="px-3 py-2 font-semibold border-b border-gray-200">Lizenz</th>
              </tr>
            </thead>
            <tbody className="text-[#4a5568]">
              {stock.map(c => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-3 py-2 align-top whitespace-nowrap">
                    {c.usage_label ?? c.page_type ?? '—'}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {c.photo_page_url ? (
                      <a
                        href={c.photo_page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#02a9e6] hover:underline"
                      >
                        {c.alt_text}
                      </a>
                    ) : (
                      c.alt_text
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {c.photographer && c.photographer_url ? (
                      <a
                        href={c.photographer_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#02a9e6] hover:underline"
                      >
                        {c.photographer}
                      </a>
                    ) : (
                      'Unsplash'
                    )}
                  </td>
                  <td className="px-3 py-2 align-top text-xs">{c.license_note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {other.length > 0 && (
        <ul className="text-sm text-[#4a5568] space-y-2 list-disc pl-5">
          {other.map(c => (
            <li key={c.id}>
              <span className="font-medium text-[#333]">{c.usage_label ?? c.alt_text}:</span>{' '}
              {c.license_note}
              {c.url.includes('supabase.co') && (
                <span className="text-[#999]"> ({c.provider})</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-[#666]">
        Unsplash-Nutzung gemäß{' '}
        <a
          href="https://unsplash.com/license"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#02a9e6] hover:underline"
        >
          Unsplash License
        </a>
        . Keine Billboards oder Wiederverkauf der Bilder als eigenständige Dateien.
      </p>
    </section>
  )
}
