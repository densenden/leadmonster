// Onboarding für neue Admin-Nutzer (Kai, Christian).
// 6-Schritt-Walkthrough mit Verweis auf die jeweiligen Howto-Markdowns.
// Server Component — keine Interaktivität nötig, das Tracking pro Schritt
// kommt in einer Folge-Iteration via einstellungen-Tabelle.
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Erste Schritte — LeadMonster Admin',
}

interface Step {
  number: number
  title: string
  description: string
  ctaHref: string
  ctaLabel: string
  howtoPath: string
}

const STEPS: Step[] = [
  {
    number: 1,
    title: 'Produkt anlegen',
    description:
      'Neue Versicherungsart als Produkt — Slug, Typ, Brand-Name, Zielgruppe. Dauert ca. 5 Minuten.',
    ctaHref: '/admin/produkte/neu',
    ctaLabel: 'Produkt anlegen',
    howtoPath: '/admin/onboarding/howto/neues-produkt-anlegen',
  },
  {
    number: 2,
    title: 'Convexa-Form-Token eintragen',
    description:
      'Pro Produkt einen eigenen Token aus convexa.app einfügen — sonst kommen Leads nicht im CRM an.',
    ctaHref: '/admin/einstellungen',
    ctaLabel: 'Einstellungen öffnen',
    howtoPath: '/admin/onboarding/howto/convexa-token-setzen',
  },
  {
    number: 3,
    title: 'Tarife per CSV importieren',
    description:
      'CSV mit Anbieter-Tarifen hochladen — Vorlage liegt unter vergleich-tarife-seeds/. Idempotent über UNIQUE-Constraint.',
    ctaHref: '/admin/tarife',
    ctaLabel: 'Tarife öffnen',
    howtoPath: '/admin/onboarding/howto/tarife-importieren-csv',
  },
  {
    number: 4,
    title: 'Bildstil setzen',
    description:
      'Referenzbild hochladen — Vision-Analyse extrahiert eine Stil-Direktive, die ab sofort alle Bilder dieses Produkts steuert.',
    ctaHref: '/admin/produkte',
    ctaLabel: 'Produkt-Detail öffnen',
    howtoPath: '/admin/onboarding/howto/bildstil-konfigurieren',
  },
  {
    number: 5,
    title: 'Inhalte generieren',
    description:
      'Generator läuft Hauptseite + FAQ + Vergleich + Tarif + 3 Ratgeber. Drafts landen als entwurf.',
    ctaHref: '/admin/produkte',
    ctaLabel: 'Inhalte generieren',
    howtoPath: '/admin/onboarding/howto/content-generieren',
  },
  {
    number: 6,
    title: 'Status auf publiziert setzen + Sitemap prüfen',
    description:
      'Pro Page-Section reviewen und auf publiziert setzen. Sitemap aktualisiert sich automatisch via revalidate=60.',
    ctaHref: '/admin/produkte',
    ctaLabel: 'Produkte öffnen',
    howtoPath: '/admin/onboarding/howto/leads-bearbeiten',
  },
]

export default function OnboardingPage() {
  return (
    <main className="max-w-4xl">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-[#1a3252] font-heading mb-2">
          Erste Schritte
        </h1>
        <p className="text-[#666]">
          So bringst du eine neue Versicherungsart von 0 auf live in ca. 30 Minuten — pro Schritt
          steht eine kurze Anleitung bereit.
        </p>
      </header>

      <ol className="space-y-5">
        {STEPS.map(step => (
          <li
            key={step.number}
            className="bg-white border border-gray-200 rounded-xl p-6 flex gap-5"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1a3252] text-[#d4af37] font-bold flex items-center justify-center font-heading">
              {step.number}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-[#1a3252] font-heading mb-1.5">
                {step.title}
              </h2>
              <p className="text-sm text-[#4a5568] leading-relaxed mb-4">
                {step.description}
              </p>
              <div className="flex gap-3 flex-wrap text-sm">
                <Link
                  href={step.ctaHref}
                  className="inline-block px-4 py-2 bg-[#1a3252] text-white rounded font-semibold hover:bg-[#0f2647] transition-colors"
                >
                  {step.ctaLabel}
                </Link>
                <Link
                  href={step.howtoPath}
                  className="inline-block px-4 py-2 border border-gray-300 text-[#1a3252] rounded font-semibold hover:bg-gray-50 transition-colors"
                >
                  Anleitung lesen
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <aside className="mt-10 p-6 bg-[#abd5f4]/30 border border-[#abd5f4] rounded-xl text-sm">
        <p className="font-semibold text-[#1a3252] mb-2">Du steckst fest?</p>
        <p className="text-[#4a5568] leading-relaxed">
          Schreib Denis (
          <a
            href="mailto:masterstudiosen@gmail.com"
            className="text-[#02a9e6] hover:underline"
          >
            masterstudiosen@gmail.com
          </a>
          ) eine Mail oder lege ein GitHub-Issue an. Alle Howtos liegen auch im Repo unter{' '}
          <code className="bg-white px-1 rounded">docs/howto/</code>.
        </p>
      </aside>
    </main>
  )
}
