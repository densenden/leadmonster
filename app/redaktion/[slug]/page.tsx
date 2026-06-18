// Public Author-Profil — H1 + Foto + Bio + Qualifikationen + Schema.org/Person.
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { renderMarkdown } from '@/lib/markdown/render'
import { buildSchemaPerson } from '@/lib/redaktion/schema-person'
import { PortraitCircle } from '@/components/ui/PortraitCircle'

export const revalidate = 3600

interface PageProps {
  params: { slug: string }
}

export async function generateStaticParams() {
  const supabase = createAdminClient()
  const { data } = await supabase.from('redaktion').select('slug').eq('public', true)
  return (data ?? []).map(r => ({ slug: r.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createAdminClient()
  const { data: a } = await supabase
    .from('redaktion')
    .select('vorname, nachname, titel, rolle, kurz_bio, foto_url')
    .eq('slug', params.slug)
    .eq('public', true)
    .maybeSingle()

  if (!a) return { title: 'Autor nicht gefunden', robots: { index: false } }

  const fullName = [a.titel, a.vorname, a.nachname].filter(Boolean).join(' ')
  return {
    title: `${fullName} — ${a.rolle}`,
    description: a.kurz_bio,
    openGraph: {
      title: `${fullName} — ${a.rolle}`,
      description: a.kurz_bio,
      images: a.foto_url ? [{ url: a.foto_url }] : undefined,
      type: 'profile',
    },
  }
}

export default async function RedaktionDetailPage({ params }: PageProps) {
  const supabase = createAdminClient()

  const { data: autor } = await supabase
    .from('redaktion')
    .select('*')
    .eq('slug', params.slug)
    .eq('public', true)
    .maybeSingle()
  if (!autor) notFound()

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://finanzteam26.de'
  // Falls schema_person nicht aktualisiert ist (alte Row), neu berechnen.
  const schemaPerson = autor.schema_person ?? buildSchemaPerson(autor, baseUrl)

  // Letzte 12 Artikel — UNION aus generierter_content + blog_posts + wissensfundus
  const [{ data: gencRows }, { data: blogRows }, { data: wissenRows }] = await Promise.all([
    supabase
      .from('generierter_content')
      .select('id, slug, title, page_type, published_at, produkte!inner(slug, name)')
      .eq('autor_id', autor.id)
      .eq('status', 'publiziert')
      .order('published_at', { ascending: false })
      .limit(8),
    supabase
      .from('blog_posts')
      .select('id, slug, title, published_at')
      .eq('autor_id', autor.id)
      .eq('status', 'publiziert')
      .order('published_at', { ascending: false })
      .limit(8),
    supabase
      .from('wissensfundus')
      .select('id, slug, thema, updated_at, kategorie')
      .eq('autor_id', autor.id)
      .eq('published', true)
      .order('updated_at', { ascending: false })
      .limit(8),
  ])

  type Artikel = { url: string; titel: string; date: string | null; kontext: string }
  const artikel: Artikel[] = []
  for (const r of gencRows ?? []) {
    const p = r.produkte as { slug: string; name: string } | null
    if (!p) continue
    const url = r.page_type === 'ratgeber' && r.slug
      ? `/${p.slug}/ratgeber/${r.slug}`
      : `/${p.slug}/${r.page_type === 'hauptseite' ? '' : r.page_type}`
    artikel.push({ url, titel: r.title ?? r.slug ?? 'Artikel', date: r.published_at, kontext: p.name })
  }
  for (const r of blogRows ?? []) {
    artikel.push({ url: `/blog/${r.slug}`, titel: r.title, date: r.published_at, kontext: 'Blog' })
  }
  for (const r of wissenRows ?? []) {
    if (!r.slug) continue
    artikel.push({
      url: `/wissen/${r.slug}`,
      titel: r.thema as string,
      date: r.updated_at,
      kontext: `Wissen · ${r.kategorie}`,
    })
  }
  artikel.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  const top12 = artikel.slice(0, 12)

  const fullName = [autor.titel, autor.vorname, autor.nachname].filter(Boolean).join(' ')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaPerson) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1a3252] to-[#0f1e34] text-white">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <nav className="text-sm text-white/60 mb-6 flex items-center gap-2 flex-wrap">
            <Link href="/" className="hover:text-white">Start</Link>
            <span>›</span>
            <Link href="/redaktion" className="hover:text-white">Redaktion</Link>
            <span>›</span>
            <span className="text-white/80">{autor.vorname} {autor.nachname}</span>
          </nav>

          <div className="flex flex-col md:flex-row items-start gap-8">
            {autor.foto_url
              ? <PortraitCircle
                  src={autor.foto_url}
                  alt={autor.foto_alt ?? fullName}
                  width={180}
                  height={180}
                  className="h-44 w-44 border-4 border-white/20"
                />
              : <div className="h-44 w-44 rounded-full bg-white/10 border-4 border-white/20 flex items-center justify-center text-3xl shrink-0">
                  {autor.vorname[0]}{autor.nachname[0]}
                </div>
            }
            <div className="min-w-0 flex-1">
              <h1 className="text-4xl md:text-5xl font-bold mb-2">{fullName}</h1>
              <p className="text-xl text-white/80 mb-4">{autor.rolle}</p>
              <p className="text-base text-white/70 max-w-2xl">{autor.kurz_bio}</p>

              <ul className="mt-6 flex flex-wrap gap-3 text-xs">
                {autor.jahre_erfahrung && (
                  <li className="rounded-full bg-white/10 px-3 py-1.5 text-white">
                    <strong>{autor.jahre_erfahrung}+</strong> Jahre Erfahrung
                  </li>
                )}
                {autor.paragraph_34d && (
                  <li className="rounded-full bg-white/10 px-3 py-1.5 text-white">
                    {autor.paragraph_34d}
                  </li>
                )}
                {autor.ihk_kammer && (
                  <li className="rounded-full bg-white/10 px-3 py-1.5 text-white">
                    Aufsicht: {autor.ihk_kammer}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Bio + Sidebar */}
      <section className="max-w-4xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <article className="lg:col-span-2 prose prose-lg max-w-none text-gray-800">
          {renderMarkdown(autor.lang_bio_md)}
        </article>

        <aside className="space-y-6">
          {(autor.qualifikationen ?? []).length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#999] mb-3">
                Qualifikationen
              </h2>
              <ul className="space-y-2 text-sm">
                {(autor.qualifikationen ?? []).map(q => (
                  <li key={q} className="text-[#333]">• {q}</li>
                ))}
              </ul>
            </div>
          )}

          {autor.vermittlerregister_nr && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#999] mb-3">
                Vermittlerregister
              </h2>
              <p className="text-[#333] mb-2">{autor.vermittlerregister_nr}</p>
              <a
                href="https://www.vermittlerregister.info/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#02a9e6] hover:underline"
              >
                Eintrag prüfen ↗
              </a>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#999] mb-3">
              Online
            </h2>
            <ul className="space-y-2 text-[#333]">
              {autor.linkedin_url && (
                <li><a href={autor.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[#02a9e6] hover:underline">LinkedIn ↗</a></li>
              )}
              {autor.xing_url && (
                <li><a href={autor.xing_url} target="_blank" rel="noopener noreferrer" className="text-[#02a9e6] hover:underline">Xing ↗</a></li>
              )}
              {autor.website_url && (
                <li><a href={autor.website_url} target="_blank" rel="noopener noreferrer" className="text-[#02a9e6] hover:underline">Website ↗</a></li>
              )}
              {autor.email && (
                <li><a href={`mailto:${autor.email}`} className="text-[#02a9e6] hover:underline">{autor.email}</a></li>
              )}
              {autor.telefon && (
                <li>{autor.telefon}</li>
              )}
            </ul>
          </div>
        </aside>
      </section>

      {/* Artikel-Liste */}
      {top12.length > 0 && (
        <section className="bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <h2 className="text-2xl font-bold text-[#1a3252] mb-6">
              Artikel von {autor.vorname} {autor.nachname}
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {top12.map(a => (
                <li key={a.url}>
                  <Link
                    href={a.url}
                    className="block rounded-lg border border-gray-200 p-4 hover:border-[#02a9e6] transition-colors"
                  >
                    <p className="text-xs text-[#999] uppercase tracking-wider mb-1">{a.kontext}</p>
                    <p className="font-semibold text-[#1a3252]">{a.titel}</p>
                    {a.date && (
                      <p className="text-xs text-[#666] mt-1">
                        {new Date(a.date).toLocaleDateString('de-DE')}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  )
}
