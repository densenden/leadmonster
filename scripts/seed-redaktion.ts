/**
 * Seed: Redaktion mit Christian Wimmer als Standard-Autor.
 *
 * Quellen:
 *  - https://www.sterbegeld24plus.de/ueber-uns/  (Christian Wimmer Profil)
 *  - https://www.linkedin.com/in/christian-wimmer-5708b9193/
 *  - https://finanzteam26.de/impressum.html       (§ 34d, IHK, Vermittlerregister-Nrn)
 *
 * Verwendung:
 *   npx tsx scripts/seed-redaktion.ts
 *
 * Idempotent: ON CONFLICT (slug) DO UPDATE.
 *
 * Foto: nach erstem Run `npx tsx scripts/import-redaktion-foto.ts`,
 * um Christians Pressefoto in den Bucket "redaktion-fotos" zu laden.
 */

import { createClient } from '@supabase/supabase-js'
import { buildSchemaPerson } from '../lib/redaktion/schema-person'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error('NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SECRET_KEY müssen in .env.local gesetzt sein.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { persistSession: false },
})

const CHRISTIAN_WIMMER = {
  slug: 'christian-wimmer',
  vorname: 'Christian',
  nachname: 'Wimmer',
  titel: null as string | null,
  rolle: 'Versicherungsmakler & Inhaber sterbegeld24plus.de',
  kurz_bio:
    'Versicherungsmakler mit über 20 Jahren Erfahrung. Spezialisiert auf Sterbegeldversicherung, '
    + 'betriebliche Krankenversicherung und Absicherung für Handwerker. Vor seiner Maklertätigkeit '
    + 'war Christian Wimmer selbst im Handwerk tätig — er kennt die Risiken aus erster Hand.',
  lang_bio_md: `## Über Christian Wimmer

Christian Wimmer ist seit über 20 Jahren als Versicherungsmakler tätig und betreibt unter
**sterbegeld24plus.de** den unabhängigen Sterbegeld-Vergleichsrechner mit aktuellen Tarifen
führender Anbieter (u. a. Allianz, DELA, Ideal, LV1871, Münchener Begräbnisverein, NÜRNBERGER).

### Werdegang
Vor seiner Tätigkeit als Versicherungsmakler war Christian Wimmer selbst im Handwerk tätig —
diese praktische Erfahrung prägt bis heute seinen Beratungsansatz: Er weiß, welche
Risiken Handwerker und Selbständige tatsächlich tragen, und welche Versicherungslücken
in dieser Berufsgruppe besonders häufig vorkommen.

### Schwerpunkte
- **Sterbegeldversicherung** (Bestattungsvorsorge ab 50, ohne Gesundheitsprüfung)
- **Betriebliche Krankenversicherung (BKV)** als Mitarbeiterbindungsinstrument
- **Berufsunfähigkeit & Unfall** für Handwerk und Selbständige
- **Pflegezusatzversicherung** für die Generation 50+

### Berufsrechtlich
- § 34d Abs. 1 GewO Versicherungsmakler
- § 34f Abs. 1 S. 1 GewO Finanzanlagenvermittler
- Aufsicht: IHK für München und Oberbayern
- Eingetragen im Vermittlerregister gemäß § 11a GewO

### Kooperation
Christian Wimmer arbeitet im Verbund mit der **finanzteam26 GmbH & Co. KG** (Neu-Ulm) —
einem Versicherungsmakler-Haus mit Sitz in Bayern, das auf ganzheitliche Beratung in
Berufsunfähigkeit, Sterbegeld und Pflege spezialisiert ist.`,
  expertise: ['sterbegeld', 'pflege', 'bu', 'unfall', 'leben', 'bkv', 'handwerker'],
  qualifikationen: [
    '§ 34d Abs. 1 GewO Versicherungsmakler',
    '§ 34f Abs. 1 S. 1 GewO Finanzanlagenvermittler',
    'BKV-Experte (betriebliche Krankenversicherung)',
    '20+ Jahre Berufserfahrung',
    'Praxisbackground im Handwerk',
  ],
  // Reg-Nrs der Kooperation finanzteam26 — bei Bedarf durch Christians persönliche Nr ersetzen
  vermittlerregister_nr: 'D-F-155-HL9G-55',
  ihk_kammer: 'IHK für München und Oberbayern',
  paragraph_34d: '§ 34d Abs. 1 GewO Versicherungsmakler',
  jahre_erfahrung: 20,
  // Foto: Standardpfad — wird durch import-redaktion-foto.ts mit Bucket-URL überschrieben
  foto_url: '/redaktion/christian-wimmer-placeholder.jpg',
  foto_alt: 'Christian Wimmer, Versicherungsmakler und Inhaber von sterbegeld24plus.de',
  email: null as string | null,
  telefon: null as string | null,
  linkedin_url: 'https://www.linkedin.com/in/christian-wimmer-5708b9193/',
  xing_url: null as string | null,
  website_url: 'https://www.sterbegeld24plus.de/',
  public: true,
}

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.sterbegeld24plus.de'

  // Wenn Row schon existiert, foto_url NICHT überschreiben (das macht der
  // import-redaktion-foto.ts-Lauf danach exklusiv).
  const { data: existing } = await supabase
    .from('redaktion')
    .select('foto_url')
    .eq('slug', CHRISTIAN_WIMMER.slug)
    .maybeSingle()

  const merged = {
    ...CHRISTIAN_WIMMER,
    foto_url: existing?.foto_url ?? CHRISTIAN_WIMMER.foto_url,
  }

  const row = {
    ...merged,
    schema_person: buildSchemaPerson(merged, baseUrl),
  }

  const { data, error } = await supabase
    .from('redaktion')
    .upsert(row, { onConflict: 'slug' })
    .select()
    .single()

  if (error) {
    console.error('Fehler beim Seed:', error)
    process.exit(1)
  }

  console.log('✓ Redaktion seeded:', data.slug, '(id:', data.id + ')')

  // Optional: Wenn ein Standard-Produkt sterbegeld24plus existiert, dort als Standard-Autor setzen
  const { data: produkt } = await supabase
    .from('produkte')
    .select('id, slug')
    .eq('slug', 'sterbegeld24plus')
    .maybeSingle()

  if (produkt) {
    await supabase
      .from('produkte')
      .update({ standard_autor_id: data.id })
      .eq('id', produkt.id)
    console.log('✓ Christian Wimmer als Standard-Autor für sterbegeld24plus gesetzt.')
  } else {
    console.log('ℹ Kein Produkt "sterbegeld24plus" gefunden — Standard-Autor-Zuordnung überspringen.')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
