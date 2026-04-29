// Impressum page — always renders (never 404), falls back to static placeholder.
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { LegalText } from '@/components/sections/LegalText'

export const revalidate = 3600

interface PageProps { params: { produkt: string } }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return { title: `Impressum — ${params.produkt}`, robots: { index: false, follow: false } }
}

const FALLBACK_BLOCKS = [
  {
    heading: 'Angaben gemäß § 5 TMG',
    body: '[FIRMENNAME]\n[STRASSE]\n[PLZ ORT]\n\nVertreten durch:\n[GESCHÄFTSFÜHRER]',
  },
  {
    heading: 'Kontakt',
    body: 'Telefon: [TELEFON]\nE-Mail: [EMAIL]',
  },
  {
    heading: 'Handelsregister',
    body: 'Registergericht: [HANDELSREGISTER]\nUmsatzsteuer-ID: [UST_ID]',
  },
  {
    heading: 'Haftung für Inhalte',
    body: 'Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.',
  },
]

async function fetchData(produkt: string) {
  try {
    const supabase = createAdminClient()
    const [{ data: produktRow }, { data: settings }] = await Promise.all([
      supabase.from('produkte').select('name').eq('slug', produkt).maybeSingle(),
      supabase.from('einstellungen').select('schluessel, wert').in('schluessel', [
        'firma_name', 'firma_strasse', 'firma_plz_ort', 'firma_email',
        'firma_telefon', 'firma_geschaeftsfuehrer', 'firma_handelsregister', 'firma_ust_id',
      ]),
    ])
    const cfg: Record<string, string> = {}
    for (const row of settings ?? []) cfg[row.schluessel] = row.wert ?? ''

    const { data: contentRow } = await supabase
      .from('generierter_content')
      .select('content')
      .eq('produkt_id', (await supabase.from('produkte').select('id').eq('slug', produkt).single()).data?.id ?? '')
      .eq('page_type', 'impressum')
      .eq('status', 'publiziert')
      .maybeSingle()

    return { produktName: produktRow?.name ?? produkt, cfg, contentRow }
  } catch {
    return { produktName: produkt, cfg: {}, contentRow: null }
  }
}

function applyConfig(blocks: typeof FALLBACK_BLOCKS, cfg: Record<string, string>) {
  return blocks.map(b => ({
    heading: b.heading,
    body: b.body
      .replace('[FIRMENNAME]', cfg.firma_name || '[Firmenname]')
      .replace('[STRASSE]', cfg.firma_strasse || '[Straße]')
      .replace('[PLZ ORT]', cfg.firma_plz_ort || '[PLZ Ort]')
      .replace('[GESCHÄFTSFÜHRER]', cfg.firma_geschaeftsfuehrer || '[Geschäftsführer]')
      .replace('[TELEFON]', cfg.firma_telefon || '[Telefon]')
      .replace('[EMAIL]', cfg.firma_email || '[E-Mail]')
      .replace('[HANDELSREGISTER]', cfg.firma_handelsregister || '[Handelsregister]')
      .replace('[UST_ID]', cfg.firma_ust_id || '[USt-ID]'),
  }))
}

export default async function ImpressumPage({ params }: PageProps) {
  const { produktName, cfg, contentRow } = await fetchData(params.produkt)

  let blocks = applyConfig(FALLBACK_BLOCKS, cfg)
  if (contentRow?.content) {
    const raw = contentRow.content as { blocks?: { heading: string; body: string }[] }
    if (Array.isArray(raw.blocks) && raw.blocks.length > 0) blocks = raw.blocks
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-[#1a365d] mb-8">Impressum — {produktName}</h1>
      <LegalText blocks={blocks} />
    </main>
  )
}
