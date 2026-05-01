import type { Metadata } from 'next'
import { loadFirmaImprint } from '@/lib/einstellungen/load'
import { DatenschutzBlocks } from '@/components/sections/DatenschutzBlocks'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Datenschutz — finanzteam26',
  robots: { index: true, follow: true },
}

export default async function GlobalDatenschutzPage() {
  const imprint = await loadFirmaImprint()
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <DatenschutzBlocks imprint={imprint} />
    </main>
  )
}
