// Edit product page — Server Component.
// Fetches the produkte row and its produkt_config, then passes them to ProduktForm.
// Calls notFound() if no product exists for the given id.
// Auth guard is inherited from app/admin/(protected)/layout.tsx.
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { ProduktForm } from '@/components/admin/ProduktForm'
import { HeroImagePanel } from './_components/HeroImagePanel'
import type { ProduktWithConfig, Produkt, ProduktConfig } from '@/lib/supabase/types'

interface PageProps {
  params: { id: string }
}

export default async function ProduktBearbeitenPage({ params }: PageProps) {
  const supabase = createAdminClient()

  // Fetch the produkte row.
  const { data: produktRow } = await supabase
    .from('produkte')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (!produktRow) {
    notFound()
  }

  // Fetch the corresponding produkt_config row (may not exist yet).
  const { data: configRow } = await supabase
    .from('produkt_config')
    .select('*')
    .eq('produkt_id', params.id)
    .maybeSingle()

  // Compose into the ProduktWithConfig shape.
  const initialData: ProduktWithConfig = {
    ...(produktRow as Produkt),
    produkt_config: configRow
      ? {
          id: configRow.id,
          produkt_id: configRow.produkt_id,
          zielgruppe: configRow.zielgruppe ?? null,
          fokus: configRow.fokus as ProduktConfig['fokus'],
          anbieter: configRow.anbieter ?? null,
          // argumente is stored as JSONB; cast to the expected shape.
          argumente:
            configRow.argumente != null &&
            typeof configRow.argumente === 'object' &&
            !Array.isArray(configRow.argumente)
              ? (configRow.argumente as Record<string, string>)
              : null,
          created_at: configRow.created_at,
          updated_at: configRow.updated_at,
        }
      : null,
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-[#333333]">
          Produkt bearbeiten: {produktRow.name}
        </h1>
        <p className="mt-1 text-sm text-[#666666]">
          Änderungen werden nach dem Speichern sofort übernommen.
        </p>
      </div>

      {/* key forces remount when product changes so useState-captured initialData
          doesn't leak across products (avoids "old names reappearing" bug) */}
      <ProduktForm key={initialData.id} mode="edit" initialData={initialData} />

      <div className="mt-10">
        <HeroImagePanel
          produktId={initialData.id}
          produktName={initialData.name}
          produktTyp={initialData.typ}
          initialUrl={initialData.hero_image_url ?? null}
          initialAlt={initialData.hero_image_alt ?? null}
        />
      </div>
    </div>
  )
}
