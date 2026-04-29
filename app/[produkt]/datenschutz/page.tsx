// Datenschutz page — always renders, falls back to static DSGVO placeholder.
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { LegalText } from '@/components/sections/LegalText'

export const revalidate = 3600

interface PageProps { params: { produkt: string } }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return { title: `Datenschutz — ${params.produkt}`, robots: { index: false, follow: false } }
}

const FALLBACK_BLOCKS = [
  {
    heading: 'Datenschutzerklärung',
    body: 'Der Schutz Ihrer persönlichen Daten ist uns ein besonderes Anliegen. Wir verarbeiten Ihre Daten daher ausschließlich auf Grundlage der gesetzlichen Bestimmungen (DSGVO, TKG 2003).',
  },
  {
    heading: 'Verantwortlicher',
    body: '[FIRMENNAME]\n[STRASSE]\n[PLZ ORT]\nE-Mail: [EMAIL]',
  },
  {
    heading: 'Erhebung und Verarbeitung personenbezogener Daten',
    body: 'Wir erheben und verarbeiten personenbezogene Daten nur, soweit dies zur Bereitstellung unserer Dienste erforderlich ist oder Sie eingewilligt haben. Dies umfasst: Name, E-Mail-Adresse, Telefonnummer bei Anfragen über Kontaktformulare.',
  },
  {
    heading: 'Ihre Rechte',
    body: 'Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Wenden Sie sich dazu an: [EMAIL]',
  },
  {
    heading: 'Cookies',
    body: 'Diese Website verwendet keine Tracking-Cookies. Technisch notwendige Cookies können für die Funktionalität der Website gesetzt werden.',
  },
]

async function fetchData(produkt: string) {
  try {
    const supabase = createAdminClient()
    const { data: produktRow } = await supabase.from('produkte').select('id, name').eq('slug', produkt).maybeSingle()
    const { data: settings } = await supabase.from('einstellungen').select('schluessel, wert').in('schluessel', [
      'firma_name', 'firma_strasse', 'firma_plz_ort', 'firma_email',
    ])
    const cfg: Record<string, string> = {}
    for (const row of settings ?? []) cfg[row.schluessel] = row.wert ?? ''

    const { data: contentRow } = await supabase
      .from('generierter_content')
      .select('content')
      .eq('produkt_id', produktRow?.id ?? '')
      .eq('page_type', 'datenschutz')
      .eq('status', 'publiziert')
      .maybeSingle()

    return { produktName: produktRow?.name ?? produkt, cfg, contentRow }
  } catch {
    return { produktName: produkt, cfg: {}, contentRow: null }
  }
}

export default async function DatenschutzPage({ params }: PageProps) {
  const { produktName, cfg, contentRow } = await fetchData(params.produkt)

  let blocks = FALLBACK_BLOCKS.map(b => ({
    heading: b.heading,
    body: b.body
      .replace('[FIRMENNAME]', cfg.firma_name || '[Firmenname]')
      .replace('[STRASSE]', cfg.firma_strasse || '[Straße]')
      .replace('[PLZ ORT]', cfg.firma_plz_ort || '[PLZ Ort]')
      .replace(/\[EMAIL\]/g, cfg.firma_email || '[E-Mail]'),
  }))

  if (contentRow?.content) {
    const raw = contentRow.content as { blocks?: { heading: string; body: string }[] }
    if (Array.isArray(raw.blocks) && raw.blocks.length > 0) blocks = raw.blocks
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-[#1a365d] mb-8">Datenschutzerklärung — {produktName}</h1>
      <LegalText blocks={blocks} />
    </main>
  )
}
