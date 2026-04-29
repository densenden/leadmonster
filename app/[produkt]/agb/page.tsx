// AGB page — always renders, falls back to static placeholder.
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { LegalText } from '@/components/sections/LegalText'

export const revalidate = 3600

interface PageProps { params: { produkt: string } }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return { title: `AGB — ${params.produkt}`, robots: { index: false, follow: false } }
}

const FALLBACK_BLOCKS = [
  {
    heading: '§ 1 Geltungsbereich',
    body: 'Diese Allgemeinen Geschäftsbedingungen gelten für alle Leistungen von [FIRMENNAME] gegenüber Verbrauchern und Unternehmern.',
  },
  {
    heading: '§ 2 Vertragsschluss',
    body: 'Das Angebot auf dieser Website stellt keine rechtlich bindende Offerte dar. Der Vertrag kommt erst durch Annahme durch [FIRMENNAME] zustande.',
  },
  {
    heading: '§ 3 Haftungsbeschränkung',
    body: 'Die auf dieser Website dargestellten Tarife und Preise sind unverbindliche Richtwerte. Für die verbindliche Auskunft wenden Sie sich bitte direkt an einen unserer Berater.',
  },
  {
    heading: '§ 4 Datenschutz',
    body: 'Der Schutz Ihrer Daten ist uns wichtig. Weitere Informationen finden Sie in unserer Datenschutzerklärung.',
  },
  {
    heading: '§ 5 Anwendbares Recht',
    body: 'Es gilt das Recht der Bundesrepublik Deutschland.',
  },
]

async function fetchData(produkt: string) {
  try {
    const supabase = createAdminClient()
    const { data: produktRow } = await supabase.from('produkte').select('id, name').eq('slug', produkt).maybeSingle()
    const { data: settings } = await supabase.from('einstellungen').select('schluessel, wert').in('schluessel', ['firma_name'])
    const cfg: Record<string, string> = {}
    for (const row of settings ?? []) cfg[row.schluessel] = row.wert ?? ''

    const { data: contentRow } = await supabase
      .from('generierter_content')
      .select('content')
      .eq('produkt_id', produktRow?.id ?? '')
      .eq('page_type', 'agb')
      .eq('status', 'publiziert')
      .maybeSingle()

    return { produktName: produktRow?.name ?? produkt, cfg, contentRow }
  } catch {
    return { produktName: produkt, cfg: {}, contentRow: null }
  }
}

export default async function AgbPage({ params }: PageProps) {
  const { produktName, cfg, contentRow } = await fetchData(params.produkt)

  let blocks = FALLBACK_BLOCKS.map(b => ({
    heading: b.heading,
    body: b.body.replace(/\[FIRMENNAME\]/g, cfg.firma_name || '[Firmenname]'),
  }))

  if (contentRow?.content) {
    const raw = contentRow.content as { blocks?: { heading: string; body: string }[] }
    if (Array.isArray(raw.blocks) && raw.blocks.length > 0) blocks = raw.blocks
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-[#1a365d] mb-8">AGB — {produktName}</h1>
      <LegalText blocks={blocks} />
    </main>
  )
}
