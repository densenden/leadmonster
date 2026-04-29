// Kontakt page — always renders, shows contact info + embedded lead form.
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { LegalText } from '@/components/sections/LegalText'

export const revalidate = 3600

interface PageProps { params: { produkt: string } }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return { title: `Kontakt — ${params.produkt}` }
}

const FALLBACK_BLOCKS = [
  {
    heading: 'Kontaktieren Sie uns',
    body: 'Wir freuen uns über Ihre Nachricht. Bitte nutzen Sie eines der folgenden Kontaktwege oder das Anfrage-Formular auf unserer Hauptseite.',
  },
  {
    heading: 'Kontaktdaten',
    body: '[FIRMENNAME]\n[STRASSE]\n[PLZ ORT]\n\nTelefon: [TELEFON]\nE-Mail: [EMAIL]',
  },
  {
    heading: 'Erreichbarkeit',
    body: 'Montag bis Freitag: 9:00 – 18:00 Uhr\nWir antworten in der Regel innerhalb von 24 Stunden.',
  },
]

async function fetchData(produkt: string) {
  try {
    const supabase = createAdminClient()
    const { data: produktRow } = await supabase.from('produkte').select('id, name').eq('slug', produkt).maybeSingle()
    const { data: settings } = await supabase.from('einstellungen').select('schluessel, wert').in('schluessel', [
      'firma_name', 'firma_strasse', 'firma_plz_ort', 'firma_email', 'firma_telefon',
    ])
    const cfg: Record<string, string> = {}
    for (const row of settings ?? []) cfg[row.schluessel] = row.wert ?? ''

    const { data: contentRow } = await supabase
      .from('generierter_content')
      .select('content')
      .eq('produkt_id', produktRow?.id ?? '')
      .eq('page_type', 'kontakt')
      .eq('status', 'publiziert')
      .maybeSingle()

    return { produktName: produktRow?.name ?? produkt, cfg, contentRow }
  } catch {
    return { produktName: produkt, cfg: {}, contentRow: null }
  }
}

export default async function KontaktPage({ params }: PageProps) {
  const { produktName, cfg, contentRow } = await fetchData(params.produkt)

  let blocks = FALLBACK_BLOCKS.map(b => ({
    heading: b.heading,
    body: b.body
      .replace('[FIRMENNAME]', cfg.firma_name || '[Firmenname]')
      .replace('[STRASSE]', cfg.firma_strasse || '[Straße]')
      .replace('[PLZ ORT]', cfg.firma_plz_ort || '[PLZ Ort]')
      .replace('[TELEFON]', cfg.firma_telefon || '[Telefon]')
      .replace('[EMAIL]', cfg.firma_email || '[E-Mail]'),
  }))

  if (contentRow?.content) {
    const raw = contentRow.content as { blocks?: { heading: string; body: string }[] }
    if (Array.isArray(raw.blocks) && raw.blocks.length > 0) blocks = raw.blocks
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-[#1a365d] mb-8">Kontakt — {produktName}</h1>
      <LegalText blocks={blocks} />
      <div className="mt-10 border-t border-gray-200 pt-8">
        <p className="text-sm text-[#666666]">
          Oder nutzen Sie direkt unser{' '}
          <a href={`/${params.produkt}#formular`} className="text-[#1a365d] underline hover:no-underline">
            Anfrage-Formular
          </a>
          .
        </p>
      </div>
    </main>
  )
}
