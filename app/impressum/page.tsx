// Globales Impressum für die Hauptdomain (PublicChrome-Layout).
import type { Metadata } from 'next'
import { loadFirmaImprint } from '@/lib/einstellungen/load'
import { loadImageCredits } from '@/lib/stock/load-image-credits'
import { ImpressumBlocks } from '@/components/sections/ImpressumBlocks'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Impressum — finanzteam26',
  robots: { index: true, follow: true },
}

export default async function GlobalImpressumPage() {
  const [imprint, imageCredits] = await Promise.all([
    loadFirmaImprint(),
    loadImageCredits(),
  ])
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <ImpressumBlocks imprint={imprint} imageCredits={imageCredits} />
    </main>
  )
}
