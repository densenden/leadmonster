import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { TrustForm } from '@/components/admin/TrustForm'
import { createTrust } from '@/app/admin/trust/actions'

export default async function NeuTrustPage() {
  const supabase = createAdminClient()
  const { data: produkteRows } = await supabase
    .from('produkte')
    .select('id, name')
    .order('name', { ascending: true })

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/trust" className="text-sm text-[#666] hover:text-[#333]">
        ← Zurück zur Liste
      </Link>
      <h1 className="mt-4 mb-2 font-heading text-3xl font-bold text-[#333]">
        Neuen Trust-Baustein anlegen
      </h1>
      <p className="mb-8 text-sm text-[#666]">
        Bild-Upload (Logo, Siegel) ist nach dem ersten Speichern verfügbar.
      </p>
      <TrustForm produkte={produkteRows ?? []} action={createTrust} />
    </div>
  )
}
