// Impressum-Renderer aus FirmaImprint-Settings.
// Schreibt alle E-E-A-T-Pflicht-Sektionen: § 5 TMG, Vertretung, Aufsicht, § 34d,
// Vermittlerregister, Berufshaftpflicht, Streitschlichtung, Redaktion V.i.S.d.P.
import type { FirmaImprint } from '@/lib/einstellungen/load'
import type { ImageCredit } from '@/lib/stock/types'
import { ImageCreditsIndex } from '@/components/sections/ImageCreditsIndex'

interface Props {
  imprint: FirmaImprint
  /** Optional: Title-Suffix (z.B. „— Sterbegeld24Plus"). */
  titleSuffix?: string
  /** Stock / KI-Bildnachweise für Impressum-Index. */
  imageCredits?: ImageCredit[]
}

function MaybeBlock({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-[#1a3252] mb-2">{heading}</h2>
      <div className="text-sm text-[#4a5568] leading-relaxed whitespace-pre-line">
        {children}
      </div>
    </section>
  )
}

export function ImpressumBlocks({ imprint, titleSuffix, imageCredits }: Props) {
  return (
    <>
      <h1 className="text-3xl font-bold text-[#1a3252] mb-8">
        Impressum{titleSuffix ? ` ${titleSuffix}` : ''}
      </h1>

      <MaybeBlock heading="Angaben gemäß § 5 TMG">
        {imprint.name ?? '[Firmenname]'}<br />
        {imprint.strasse ?? '[Straße]'}<br />
        {imprint.plz_ort ?? '[PLZ Ort]'}
      </MaybeBlock>

      {imprint.geschaeftsfuehrer && (
        <MaybeBlock heading="Vertretungsberechtigte">
          {imprint.geschaeftsfuehrer}
        </MaybeBlock>
      )}

      <MaybeBlock heading="Kontakt">
        {imprint.telefon && <>Telefon: {imprint.telefon}<br /></>}
        {imprint.telefax && <>Telefax: {imprint.telefax}<br /></>}
        {imprint.email && <>E-Mail: <a href={`mailto:${imprint.email}`} className="text-[#02a9e6] hover:underline">{imprint.email}</a></>}
      </MaybeBlock>

      {imprint.handelsregister && (
        <MaybeBlock heading="Handelsregister">
          {imprint.handelsregister}
        </MaybeBlock>
      )}

      {imprint.aufsicht && (
        <MaybeBlock heading="Aufsichtsbehörde">
          {imprint.aufsicht}
        </MaybeBlock>
      )}

      {imprint.paragraph_34d && (
        <MaybeBlock heading="Berufsrechtliche Zulassung (§ 34d / § 34f GewO)">
          {imprint.paragraph_34d}
        </MaybeBlock>
      )}

      {imprint.vermittlerregister && (
        <MaybeBlock heading="Eintragung im Vermittlerregister">
          {imprint.vermittlerregister}
          <p className="mt-2 text-xs text-[#666]">
            Verifizieren auf:{' '}
            <a
              href="https://www.vermittlerregister.info/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#02a9e6] hover:underline"
            >
              vermittlerregister.info
            </a>
          </p>
        </MaybeBlock>
      )}

      {imprint.berufshaftpflicht && (
        <MaybeBlock heading="Berufshaftpflichtversicherung">
          {imprint.berufshaftpflicht}
        </MaybeBlock>
      )}

      {imprint.streitschlichtung && (
        <MaybeBlock heading="Verbraucherstreitschlichtung">
          {imprint.streitschlichtung}
        </MaybeBlock>
      )}

      {imprint.redaktion_v_i_s_d_p && (
        <MaybeBlock heading="Verantwortlich nach § 18 Abs. 2 MStV">
          {imprint.redaktion_v_i_s_d_p}
        </MaybeBlock>
      )}

      <MaybeBlock heading="Haftung für Inhalte">
        Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf
        diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
      </MaybeBlock>

      {imageCredits && imageCredits.length > 0 && (
        <ImageCreditsIndex credits={imageCredits} />
      )}
    </>
  )
}
