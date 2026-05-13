// Globale Kontakt-Seite für die Hauptdomain. Liest Firmendaten aus
// `einstellungen` und bietet einen direkten Pfad zum Anfrage-Formular
// des Root-Produkts (sterbegeld24plus → `/#formular`).
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { LegalText } from '@/components/sections/LegalText'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Kontakt — finanzteam26',
  robots: { index: true, follow: true },
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

async function loadCfg() {
  try {
    const supabase = createAdminClient()
    const { data: settings } = await supabase
      .from('einstellungen')
      .select('schluessel, wert')
      .in('schluessel', [
        'firma_name',
        'firma_strasse',
        'firma_plz_ort',
        'firma_email',
        'firma_telefon',
      ])
    const cfg: Record<string, string> = {}
    for (const row of settings ?? []) cfg[row.schluessel] = row.wert ?? ''
    return cfg
  } catch {
    return {}
  }
}

export default async function GlobalKontaktPage() {
  const cfg = await loadCfg()

  const blocks = FALLBACK_BLOCKS.map(b => ({
    heading: b.heading,
    body: b.body
      .replace('[FIRMENNAME]', cfg.firma_name || '[Firmenname]')
      .replace('[STRASSE]', cfg.firma_strasse || '[Straße]')
      .replace('[PLZ ORT]', cfg.firma_plz_ort || '[PLZ Ort]')
      .replace('[TELEFON]', cfg.firma_telefon || '[Telefon]')
      .replace('[EMAIL]', cfg.firma_email || '[E-Mail]'),
  }))

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-[#1a365d] mb-8">Kontakt</h1>
      <LegalText blocks={blocks} />
      <div className="mt-10 border-t border-gray-200 pt-8">
        <p className="text-sm text-[#666666]">
          Oder nutzen Sie direkt unser{' '}
          <a
            href="/#formular"
            className="text-[#1a365d] underline hover:no-underline"
          >
            Anfrage-Formular
          </a>
          .
        </p>
      </div>
    </main>
  )
}
