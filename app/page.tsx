import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'LeadMonster — Versicherungsprodukte',
  description: 'Übersicht aller Versicherungsprodukte im LeadMonster System',
}

export default async function HomePage() {
  let produkte: { slug: string; name: string; status: string }[] = []

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('produkte')
      .select('slug, name, status')
      .eq('status', 'aktiv')
      .order('name')
    produkte = data ?? []
  } catch {
    // DB not yet set up — show empty state
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Image src="/logo.png" alt="LeadMonster" width={140} height={42} priority />
        <Link
          href="/admin"
          className="bg-[#abd5f4] hover:bg-[#8fc4e8] text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          Admin →
        </Link>
      </header>

      <div className="container mx-auto px-6 py-16 max-w-4xl">
        {produkte.length > 0 ? (
          <>
            <h1 className="text-3xl font-bold text-[#1a365d] mb-8">Versicherungsprodukte</h1>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {produkte.map((p) => (
                <Link
                  key={p.slug}
                  href={`/${p.slug}`}
                  className="block border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-[#abd5f4] transition-all"
                >
                  <h2 className="font-semibold text-[#1a365d] text-lg">{p.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">/{p.slug}</p>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-24">
            <h1 className="text-3xl font-bold text-[#1a365d] mb-4">LeadMonster</h1>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Das System ist bereit. Legen Sie Ihr erstes Produkt im Admin-Bereich an.
            </p>
            <Link
              href="/admin"
              className="inline-block bg-[#1a365d] text-white font-medium px-8 py-3 hover:bg-[#15284d] transition-colors"
            >
              Admin-Bereich öffnen
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
