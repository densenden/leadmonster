// AuthorByline — Server Component.
// Lädt entweder den explizit übergebenen Autor oder fällt auf den Produkt-Standard-Autor zurück.
// Rendert eine Card- oder Footer-Variante + JSON-LD-Person-Schema.
import Link from 'next/link'
import { resolveAuthor } from '@/lib/redaktion/load'

interface Props {
  autorId?: string | null
  reviewerId?: string | null
  reviewedAt?: string | null
  produktId?: string | null
  variant?: 'card' | 'compact' | 'footer'
  /** Sichtbares Datum „Stand …" — Default = reviewedAt oder dateModified */
  standDate?: string | null
}

export async function AuthorByline({
  autorId,
  reviewerId,
  reviewedAt,
  produktId,
  variant = 'card',
  standDate,
}: Props) {
  const { autor, reviewer, source } = await resolveAuthor({
    autorId,
    reviewerId,
    reviewedAt,
    produktId,
  })

  if (!autor) return null

  const fullName = [autor.titel, autor.vorname, autor.nachname].filter(Boolean).join(' ')
  const reviewerName = reviewer ? `${reviewer.vorname} ${reviewer.nachname}` : null
  const stand = standDate ?? reviewedAt ?? null
  const standFormatted = stand
    ? new Date(stand).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
    : null
  const profilUrl = `/redaktion/${autor.slug}`

  if (variant === 'footer') {
    return (
      <>
        <p className="text-xs text-[#666] flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>Geprüft von</span>
          <Link href={profilUrl} className="font-medium text-[#1a365d] hover:underline">
            {reviewerName ?? fullName}
          </Link>
          {standFormatted && <span>· Stand {standFormatted}</span>}
        </p>
        {autor.schema_person && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(autor.schema_person) }}
          />
        )}
      </>
    )
  }

  if (variant === 'compact') {
    return (
      <>
        <div className="flex items-center gap-3 text-sm text-[#666]">
          {autor.foto_url && (
            <img
              src={autor.foto_url}
              alt={autor.foto_alt ?? fullName}
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover object-[center_25%] border border-gray-200"
              loading="lazy"
            />
          )}
          <div>
            <span>Verfasst von </span>
            <Link href={profilUrl} className="font-medium text-[#1a365d] hover:underline">
              {fullName}
            </Link>
            {standFormatted && <span> · Stand {standFormatted}</span>}
          </div>
        </div>
        {autor.schema_person && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(autor.schema_person) }}
          />
        )}
      </>
    )
  }

  return (
    <>
      <aside
        className="my-6 rounded-xl border border-gray-200 bg-white p-5 flex items-start gap-4"
        aria-label="Verfasst von"
      >
        {autor.foto_url ? (
          <img
            src={autor.foto_url}
            alt={autor.foto_alt ?? fullName}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover object-[center_25%] border border-gray-200 shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-sm text-gray-400 shrink-0">
            {autor.vorname[0]}{autor.nachname[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wide text-[#999]">
            {source === 'fallback' ? 'Verantwortlich' : 'Verfasst von'}
          </div>
          <Link href={profilUrl} className="block font-heading text-lg font-bold text-[#1a365d] hover:underline">
            {fullName}
          </Link>
          <p className="text-sm text-[#666]">{autor.rolle}</p>
          {(autor.qualifikationen ?? []).length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1">
              {(autor.qualifikationen ?? []).slice(0, 3).map(q => (
                <li
                  key={q}
                  className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-[#666]"
                >
                  {q}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 text-xs text-[#666] flex flex-wrap gap-x-3 gap-y-1">
            {standFormatted && (
              <span>
                <strong className="text-[#333]">Stand:</strong> {standFormatted}
              </span>
            )}
            {reviewerName && reviewer?.slug !== autor.slug && (
              <span>
                <strong className="text-[#333]">Geprüft von:</strong>{' '}
                <Link href={`/redaktion/${reviewer?.slug}`} className="text-[#1a365d] hover:underline">
                  {reviewerName}
                </Link>
              </span>
            )}
            {autor.vermittlerregister_nr && (
              <span>
                <strong className="text-[#333]">VermReg:</strong> {autor.vermittlerregister_nr}
              </span>
            )}
          </div>
        </div>
      </aside>
      {autor.schema_person && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(autor.schema_person) }}
        />
      )}
    </>
  )
}
