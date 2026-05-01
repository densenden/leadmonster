// Erstinformation gem. § 15 VersVermV — Pflichtangabe für Versicherungsmakler.
import type { Metadata } from 'next'
import { loadFirmaImprint } from '@/lib/einstellungen/load'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Erstinformation nach § 15 VersVermV — finanzteam26',
  robots: { index: true, follow: true },
  description:
    'Pflicht-Erstinformation des Versicherungsmaklers gemäß § 15 VersVermV — '
    + 'Status, Aufsicht, Vermittlerregister, Berufshaftpflicht, Streitschlichtung.',
}

export default async function ErstinformationPage() {
  const imprint = await loadFirmaImprint()
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-[#1a3252] mb-3">
        Erstinformation für Versicherungsnehmer
      </h1>
      <p className="text-sm text-[#666] mb-8">
        nach § 15 Versicherungsvermittlungsverordnung (VersVermV)
      </p>

      <Section heading="1. Identität des Versicherungsmaklers">
        <p className="whitespace-pre-line">
          {imprint.name ?? '[Firmenname]'}{'\n'}
          {imprint.strasse ?? ''}{'\n'}
          {imprint.plz_ort ?? ''}{'\n\n'}
          Telefon: {imprint.telefon ?? '—'}{'\n'}
          E-Mail: {imprint.email ?? '—'}
        </p>
        {imprint.geschaeftsfuehrer && (
          <p className="mt-3"><strong>Vertretungsberechtigt:</strong> {imprint.geschaeftsfuehrer}</p>
        )}
      </Section>

      <Section heading="2. Status / Erlaubnis">
        <p>{imprint.paragraph_34d ?? '—'}</p>
      </Section>

      <Section heading="3. Eintragung im Vermittlerregister">
        <p>{imprint.vermittlerregister ?? '—'}</p>
        <p className="mt-2 text-sm text-[#666]">
          Sie können den Eintrag öffentlich kostenfrei abfragen unter{' '}
          <a href="https://www.vermittlerregister.info/" target="_blank" rel="noopener noreferrer" className="text-[#02a9e6] hover:underline">
            www.vermittlerregister.info
          </a> bzw. bei der DIHK (Telefon 0180 6 005850).
        </p>
      </Section>

      <Section heading="4. Zuständige Aufsichtsbehörde">
        <p>{imprint.aufsicht ?? '—'}</p>
      </Section>

      <Section heading="5. Vergütung">
        <p>
          Wir erhalten für unsere Vermittlungstätigkeit von dem jeweiligen
          Versicherungsunternehmen eine Provision, die im Versicherungsbeitrag
          enthalten ist. Eine separate Vergütung durch Sie als Kunde fällt nicht an,
          es sei denn, wir vereinbaren ausdrücklich eine Honorarberatung.
        </p>
      </Section>

      <Section heading="6. Berufshaftpflichtversicherung">
        <p>{imprint.berufshaftpflicht ?? '—'}</p>
      </Section>

      <Section heading="7. Streitschlichtung">
        <p className="whitespace-pre-line">{imprint.streitschlichtung ?? '—'}</p>
      </Section>

      <Section heading="8. Beteiligungen / Verflechtungen">
        <p>
          Wir halten keine direkten oder indirekten Beteiligungen ≥ 10 % an
          Versicherungsunternehmen. Kein Versicherungsunternehmen hält direkte
          oder indirekte Beteiligungen ≥ 10 % an unserer Gesellschaft.
        </p>
      </Section>
    </main>
  )
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-[#1a3252] mb-2">{heading}</h2>
      <div className="text-sm text-[#4a5568] leading-relaxed">{children}</div>
    </section>
  )
}
