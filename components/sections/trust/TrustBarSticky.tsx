// Sticky Trust-Bar unter dem Hero — 4-6 Logos (Pressezitate-Kacheln + Partner-Logos).
// Server Component, lädt selbständig.
import Link from 'next/link'
import { loadTrust } from '@/lib/trust/load'

interface Props {
  produktId?: string | null
}

export async function TrustBarSticky({ produktId }: Props) {
  const items = await loadTrust({
    produktId,
    typen: ['pressezitat', 'siegel', 'partner_logo', 'auszeichnung'],
    limit: 6,
  })
  if (items.length === 0) return null

  return (
    <section
      aria-label="Vertrauenssignale"
      className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200"
    >
      <ul
        role="list"
        className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
      >
        {items.map(it => (
          <li key={it.id} className="flex items-center gap-2 text-xs text-[#666]">
            {it.bild_url
              ? <img
                  src={it.bild_url}
                  alt={it.bild_alt ?? it.titel}
                  className="h-8 w-auto object-contain max-w-[120px]"
                  loading="lazy"
                />
              : null
            }
            {it.quelle_url ? (
              <Link href={it.quelle_url} target="_blank" rel="noopener noreferrer" className="hover:text-[#02a9e6]">
                <span className="font-medium text-[#333]">{it.titel}</span>
                {it.score && <span className="ml-1 text-[#02a9e6] font-bold">{it.score}</span>}
              </Link>
            ) : (
              <>
                <span className="font-medium text-[#333]">{it.titel}</span>
                {it.score && <span className="ml-1 text-[#02a9e6] font-bold">{it.score}</span>}
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
