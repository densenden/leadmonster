// Impressum — finanzteam26 Pflichtangaben aus `einstellungen` (Spec §3.1).
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { loadFirmaImprint } from '@/lib/einstellungen/load'
import { loadImageCredits } from '@/lib/stock/load-image-credits'
import { ImpressumBlocks } from '@/components/sections/ImpressumBlocks'

export const revalidate = 3600

interface PageProps { params: { produkt: string } }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return { title: `Impressum — ${params.produkt}`, robots: { index: false, follow: false } }
}

export default async function ImpressumPage({ params }: PageProps) {
  const supabase = createAdminClient()
  const [{ data: produktRow }, imprint, imageCredits] = await Promise.all([
    supabase.from('produkte').select('name').eq('slug', params.produkt).maybeSingle(),
    loadFirmaImprint(),
    loadImageCredits(),
  ])
  const produktName = produktRow?.name ?? params.produkt

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <ImpressumBlocks
        imprint={imprint}
        titleSuffix={`— ${produktName}`}
        imageCredits={imageCredits}
      />
    </main>
  )
}
