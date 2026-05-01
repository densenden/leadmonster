// Datenschutz-Renderer aus FirmaImprint + dsgvo_av_anbieter.
// Listet alle Auftragsverarbeiter explizit (DSGVO Art. 28) sowie KI-Drittland-AVs.
import type { FirmaImprint } from '@/lib/einstellungen/load'

interface Props {
  imprint: FirmaImprint
  titleSuffix?: string
}

function Block({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-[#1a3252] mb-2">{heading}</h2>
      <div className="text-sm text-[#4a5568] leading-relaxed">
        {children}
      </div>
    </section>
  )
}

// Splittet die `dsgvo_av_anbieter`-Liste an Semikolon → Renderliste
function parseAVs(raw: string | null): { name: string; meta: string }[] {
  if (!raw) return []
  return raw.split(';').map(part => {
    const trimmed = part.trim()
    const m = trimmed.match(/^([^(]+)(\([^)]*\))?\s*(.*)$/)
    if (!m) return { name: trimmed, meta: '' }
    return {
      name: m[1].trim(),
      meta: [m[2], m[3]].filter(Boolean).join(' ').trim(),
    }
  })
}

export function DatenschutzBlocks({ imprint, titleSuffix }: Props) {
  const avs = parseAVs(imprint.dsgvo_av_anbieter)
  return (
    <>
      <h1 className="text-3xl font-bold text-[#1a3252] mb-8">
        Datenschutzerklärung{titleSuffix ? ` ${titleSuffix}` : ''}
      </h1>

      <Block heading="Verantwortlicher (Art. 4 Nr. 7 DSGVO)">
        <p className="whitespace-pre-line">
          {imprint.name ?? ''}{'\n'}{imprint.strasse ?? ''}{'\n'}{imprint.plz_ort ?? ''}
        </p>
        {imprint.email && (
          <p className="mt-2">E-Mail: <a href={`mailto:${imprint.email}`} className="text-[#02a9e6] hover:underline">{imprint.email}</a></p>
        )}
      </Block>

      <Block heading="Erhebung und Verarbeitung personenbezogener Daten">
        Wir erheben und verarbeiten personenbezogene Daten nur, soweit dies zur
        Bereitstellung unserer Dienste erforderlich ist oder Sie eingewilligt haben.
        Dies umfasst: Name, E-Mail-Adresse, Telefonnummer bei Anfragen über
        Kontaktformulare und Lead-Formulare. Rechtsgrundlage: Art. 6 Abs. 1
        lit. a (Einwilligung) und Art. 6 Abs. 1 lit. b DSGVO (Vertragsanbahnung).
      </Block>

      {avs.length > 0 && (
        <Block heading="Auftragsverarbeiter (Art. 28 DSGVO)">
          <p className="mb-3">
            Zur Bereitstellung unserer Dienste arbeiten wir mit folgenden
            Auftragsverarbeitern zusammen, mit denen wir die gesetzlich vorgeschriebenen
            Auftragsverarbeitungsverträge abgeschlossen haben:
          </p>
          <ul className="space-y-2 list-disc pl-5">
            {avs.map((av, i) => (
              <li key={i}>
                <strong className="text-[#333]">{av.name}</strong>
                {av.meta && <span className="text-[#666]"> — {av.meta}</span>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[#666]">
            Bei Drittland-Übermittlungen (z. B. USA) liegt eine zusätzliche
            Garantie über EU-Standardvertragsklauseln (SCC, Art. 46 Abs. 2 lit. c DSGVO) vor.
          </p>
        </Block>
      )}

      <Block heading="Ihre Rechte">
        Sie haben jederzeit das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16),
        Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit
        (Art. 20) und Widerspruch (Art. 21). Wenden Sie sich dazu an
        {imprint.email ? ` ${imprint.email}` : ' den oben genannten Verantwortlichen'}.
        Außerdem haben Sie das Recht auf Beschwerde bei einer Aufsichtsbehörde
        (Art. 77 DSGVO).
      </Block>

      <Block heading="Cookies und Tracking">
        Diese Website verwendet ausschließlich technisch notwendige Cookies für
        Session-Verwaltung. Es findet kein Tracking statt. UTM-Parameter werden zur
        Quellen-Attribution unserer Lead-Formulare in aggregierter Form gespeichert.
      </Block>
    </>
  )
}
