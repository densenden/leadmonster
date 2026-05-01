// Datenschutz — vollständig aus einstellungen + dsgvo_av_anbieter.
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { loadFirmaImprint } from '@/lib/einstellungen/load'
import { DatenschutzBlocks } from '@/components/sections/DatenschutzBlocks'

export const revalidate = 3600

interface PageProps { params: { produkt: string } }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return { title: `Datenschutz — ${params.produkt}`, robots: { index: false, follow: false } }
}

export default async function DatenschutzPage({ params }: PageProps) {
  const supabase = createAdminClient()
  const [{ data: produktRow }, imprint] = await Promise.all([
    supabase.from('produkte').select('name').eq('slug', params.produkt).maybeSingle(),
    loadFirmaImprint(),
  ])
  const produktName = produktRow?.name ?? params.produkt

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <DatenschutzBlocks imprint={imprint} titleSuffix={`— ${produktName}`} />
    </main>
  )
}
