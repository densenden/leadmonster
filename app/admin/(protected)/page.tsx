import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export default async function AdminDashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const db = createAdminClient()

  const [{ count: produkteCount }, { count: leadsCount }, { count: wissensCount }] =
    await Promise.all([
      db.from('produkte').select('*', { count: 'exact', head: true }),
      db.from('leads').select('*', { count: 'exact', head: true }),
      db.from('wissensfundus').select('*', { count: 'exact', head: true }),
    ])

  const tiles = [
    {
      label: 'Produkte',
      count: produkteCount ?? 0,
      href: '/admin/produkte',
      cta: 'Neues Produkt →',
      ctaHref: '/admin/produkte/neu',
    },
    {
      label: 'Leads',
      count: leadsCount ?? 0,
      href: '/admin/leads',
      cta: 'Alle Leads →',
      ctaHref: '/admin/leads',
    },
    {
      label: 'Wissensfundus',
      count: wissensCount ?? 0,
      href: '/admin/wissensfundus',
      cta: 'Eintrag anlegen →',
      ctaHref: '/admin/wissensfundus/neu',
    },
  ]

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-[#1a365d] mb-1">Dashboard</h1>
      <p className="text-gray-500 mb-8 text-sm">Willkommen, {user?.email}</p>

      <div className="grid grid-cols-3 gap-5 mb-10">
        {tiles.map((t) => (
          <div key={t.label} className="bg-white border border-gray-200 rounded-xl p-6">
            <p className="text-3xl font-bold text-[#1a365d]">{t.count}</p>
            <p className="text-gray-500 text-sm mt-1 mb-4">{t.label}</p>
            <Link href={t.ctaHref} className="text-[#abd5f4] hover:underline text-sm font-medium">
              {t.cta}
            </Link>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-[#1a365d] mb-4">Schnellstart</h2>
        <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
          <li>
            <Link href="/admin/wissensfundus/neu" className="text-[#abd5f4] hover:underline">
              Wissensfundus befüllen
            </Link>
            {' '}— 5 Artikel für Sterbegeld anlegen
          </li>
          <li>
            <Link href="/admin/produkte/neu" className="text-[#abd5f4] hover:underline">
              Erstes Produkt anlegen
            </Link>
            {' '}— sterbegeld24plus mit Konfiguration
          </li>
          <li>
            Content generieren — Claude API aufrufen im Produkt-Editor
          </li>
          <li>
            Content reviewen und auf <em>publiziert</em> setzen
          </li>
          <li>
            <Link href="/admin/einstellungen" className="text-[#abd5f4] hover:underline">
              Einstellungen
            </Link>
            {' '}— Confluence & E-Mail konfigurieren
          </li>
        </ol>
      </div>
    </div>
  )
}
