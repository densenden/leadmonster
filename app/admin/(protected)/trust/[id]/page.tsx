import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { TrustForm } from '@/components/admin/TrustForm'
import { updateTrust } from '@/app/admin/trust/actions'

export const dynamic = 'force-dynamic'

interface PageProps { params: { id: string } }

export default async function EditTrustPage({ params }: PageProps) {
  const supabase = createAdminClient()
  const [{ data: baustein }, { data: produkteRows }] = await Promise.all([
    supabase.from('trust_baustein').select('*').eq('id', params.id).maybeSingle(),
    supabase.from('produkte').select('id, name').order('name', { ascending: true }),
  ])
  if (!baustein) notFound()

  const updateAction = updateTrust.bind(null, params.id)
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/trust" className="text-sm text-[#666] hover:text-[#333]">
        ← Zurück zur Liste
      </Link>
      <h1 className="mt-4 mb-2 font-heading text-3xl font-bold text-[#333]">
        {baustein.titel}
      </h1>
      <TrustForm baustein={baustein} bausteinId={params.id} produkte={produkteRows ?? []} action={updateAction} />
    </div>
  )
}
