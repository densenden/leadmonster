// Trust-Section vor LeadForm — 3 Pressezitate + 2 Kundenstimmen mit Review-Schema.
import { loadTrust } from '@/lib/trust/load'

interface Props {
  produktId?: string | null
  produktName?: string
}

export async function TrustBlock({ produktId, produktName }: Props) {
  const [presse, reviews] = await Promise.all([
    loadTrust({ produktId, typen: ['pressezitat'], limit: 3 }),
    loadTrust({ produktId, typen: ['kunden_review'], limit: 2 }),
  ])

  if (presse.length === 0 && reviews.length === 0) return null

  // AggregateRating + Review-Schema
  const numericScores = reviews
    .map(r => parseFloat((r.score ?? '').replace(',', '.')))
    .filter(n => !Number.isNaN(n))
  const avg = numericScores.length > 0
    ? numericScores.reduce((a, b) => a + b, 0) / numericScores.length
    : null

  const reviewSchemas = reviews.map(r => ({
    '@type': 'Review',
    author: { '@type': 'Person', name: r.autor_name ?? 'Anonymer Kunde' },
    reviewBody: r.body,
    datePublished: r.jahr ? `${r.jahr}-01-01` : undefined,
    reviewRating: r.score ? {
      '@type': 'Rating',
      ratingValue: r.score,
      bestRating: '5',
    } : undefined,
  }))

  const schemas: Record<string, unknown>[] = []
  if (reviewSchemas.length > 0 && produktName) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: produktName,
      review: reviewSchemas,
      aggregateRating: avg ? {
        '@type': 'AggregateRating',
        ratingValue: avg.toFixed(1),
        reviewCount: reviews.length,
        bestRating: '5',
      } : undefined,
    })
  }

  return (
    <section className="py-16 bg-[#f7fafc]">
      {schemas.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas[0]) }}
        />
      )}
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1a3252] text-center mb-10">
          Was über uns gesagt wird
        </h2>

        {presse.length > 0 && (
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {presse.map(p => (
              <li key={p.id} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  {p.bild_url && (
                    <img src={p.bild_url} alt={p.bild_alt ?? p.quelle_name ?? ''} className="h-8 w-auto object-contain max-w-[80px]" />
                  )}
                  <div className="text-xs uppercase tracking-wider text-[#02a9e6] font-semibold">
                    {p.quelle_name}{p.jahr ? ` · ${p.jahr}` : ''}
                  </div>
                </div>
                <blockquote className="text-base text-[#1a3252] leading-relaxed">
                  „{p.body ?? p.titel}&ldquo;
                </blockquote>
                {p.score && (
                  <p className="mt-3 text-xl font-bold text-[#02a9e6]">{p.score}</p>
                )}
                {p.quelle_url && (
                  <a href={p.quelle_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs text-[#666] hover:text-[#02a9e6]">
                    Quelle ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}

        {reviews.length > 0 && (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map(r => (
              <li key={r.id} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-[#1a3252]">
                    {r.autor_name ?? 'Anonyme Kundin'}
                    {r.autor_alter && <span className="text-[#999] font-normal ml-1">· {r.autor_alter}</span>}
                  </p>
                  {r.score && <span className="text-[#02a9e6] font-bold">{r.score}</span>}
                </div>
                <blockquote className="text-sm text-[#4a5568] leading-relaxed italic">
                  „{r.body ?? r.titel}&ldquo;
                </blockquote>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
