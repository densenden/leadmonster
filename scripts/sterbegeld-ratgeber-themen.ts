/**
 * 20 Sterbegeld-Ratgeber-Themen (Long-Tail + AEO-Fragen).
 *
 * Diese Konstante wird vom Batch-Generator-Script genutzt, um über die
 * `/api/admin/internal/generate-batch`-Route je Thema einen Ratgeber-Eintrag
 * in `generierter_content` mit Status `entwurf` anzulegen.
 *
 * Slug-Konvention: lowercase, deutsch, Bindestrich-getrennt. Diese Slugs
 * werden direkt als URL-Path unter `/<produkt>/ratgeber/<slug>` veröffentlicht
 * sobald Christian/Kai sie via Admin auf `publiziert` setzen.
 */

export interface RatgeberThema {
  slug: string
  titel: string
  hinweis: string
}

export const STERBEGELD_RATGEBER_THEMEN: ReadonlyArray<RatgeberThema> = [
  {
    slug: 'sterbegeld-mit-vorerkrankungen',
    titel: 'Sterbegeld mit Vorerkrankungen',
    hinweis: 'Aufnahmegarantie, Wartezeit, was zu beachten ist.',
  },
  {
    slug: 'sterbegeld-vs-bestattungsvorsorge',
    titel: 'Sterbegeld vs. Bestattungsvorsorge — was passt zu mir?',
    hinweis: 'Vergleich beider Konzepte, Vor- und Nachteile.',
  },
  {
    slug: 'wie-hoch-versicherungssumme',
    titel: 'Wie hoch sollte die Versicherungssumme sein?',
    hinweis: 'Orientierung an realen Bestattungskosten 2026.',
  },
  {
    slug: 'sterbegeld-fuer-beamte',
    titel: 'Sterbegeld für Beamte',
    hinweis: 'Besonderheit der Beamtenversorgung + ergänzende Privatpolice.',
  },
  {
    slug: 'sterbegeld-kuendigen',
    titel: 'Sterbegeldversicherung kündigen — geht das?',
    hinweis: 'Rückkaufswert, Wartezeit-Anrechnung, Beitragsfreistellung.',
  },
  {
    slug: 'beerdigungskosten-2026',
    titel: 'Beerdigungskosten 2026 im Überblick',
    hinweis: 'Sarg, Friedhof, Trauerfeier, Grabstein — reale Spannen.',
  },
  {
    slug: 'sterbegeld-steuerfrei',
    titel: 'Ist Sterbegeld steuerfrei?',
    hinweis: 'Erbschaftsteuer, Bezugsberechtigung, Freibeträge.',
  },
  {
    slug: 'sterbegeld-bei-suizid',
    titel: 'Sterbegeld bei Suizid — was zahlt die Versicherung?',
    hinweis: 'Sensibles Thema, Karenzzeit, Klauseln, würdig formuliert.',
  },
  {
    slug: 'sterbegeld-auszahlen-lassen',
    titel: 'Sterbegeld auszahlen lassen — wie funktioniert das?',
    hinweis: 'Auszahlungsweg an Hinterbliebene, Fristen, benötigte Unterlagen.',
  },
  {
    slug: 'sterbegeld-vs-risikolebensversicherung',
    titel: 'Sterbegeld vs. Risikolebensversicherung',
    hinweis: 'Wann welche, Kombination, Kostenrechnung.',
  },
  {
    slug: 'sterbegeld-fuer-senioren-80plus',
    titel: 'Sterbegeld für Senioren über 80',
    hinweis: 'Aufnahmealter, höhere Beiträge, Aufnahmegarantie.',
  },
  {
    slug: 'sterbegeld-ohne-gesundheitsfragen',
    titel: 'Sterbegeldversicherung ohne Gesundheitsfragen',
    hinweis: 'Welche Anbieter, Wartezeit-Kompromiss, Sofortschutz Unfall.',
  },
  {
    slug: 'sterbegeld-vs-sparplan',
    titel: 'Sterbegeld vs. Sparplan — was lohnt sich?',
    hinweis: 'Rendite, Auszahlungssicherheit, Verfügbarkeit.',
  },
  {
    slug: 'sterbegeld-und-pflegezusatz',
    titel: 'Sterbegeld + Pflegezusatzversicherung kombinieren',
    hinweis: 'Sinnvolle Bausteine für die Generation 60+, Konditionen.',
  },
  {
    slug: 'sterbegeld-online-abschliessen',
    titel: 'Sterbegeldversicherung online abschließen',
    hinweis: 'Schritte, Antrag, digitale Beratung mit Christian Wimmer.',
  },
  {
    slug: 'sterbegeld-wartezeit-umgehen',
    titel: 'Wartezeit umgehen — geht das?',
    hinweis: 'Sofortschutz Unfall, Kombi-Tarife, transparente Aufklärung.',
  },
  {
    slug: 'sterbegeld-fuer-buergergeld-empfaenger',
    titel: 'Sterbegeld für Bürgergeld-Empfänger',
    hinweis: 'Schonvermögen, anrechenbares Vermögen, Praxis-Tipps.',
  },
  {
    slug: 'sterbegeld-bei-scheidung',
    titel: 'Was passiert mit dem Sterbegeld bei Scheidung?',
    hinweis: 'Bezugsberechtigung ändern, Versorgungsausgleich.',
  },
  {
    slug: 'sterbegeld-als-erbe-steuerlich',
    titel: 'Sterbegeld als Erbe — steuerliche Behandlung',
    hinweis: 'Erbschaftsteuer-Konstellationen, Freibetrag.',
  },
  {
    slug: 'sterbegeld-mit-bestatter-treuhand-kombinieren',
    titel: 'Sterbegeld mit Bestatter-Treuhand kombinieren',
    hinweis: 'Vor-/Nachteile, Liquiditäts-Sicherheit, Anbieter-Auswahl.',
  },
]
