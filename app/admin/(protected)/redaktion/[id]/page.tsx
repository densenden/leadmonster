// Edit-Form für einen Autor.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { RedaktionForm } from '@/components/admin/RedaktionForm'
import { updateAutor } from '@/app/admin/redaktion/actions'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { id: string }
}

export default async function EditAutorPage({ params }: PageProps) {
  const supabase = createAdminClient()
  const { data: autor, error } = await supabase
    .from('redaktion')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !autor) notFound()

  const updateAction = updateAutor.bind(null, params.id)

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/redaktion" className="text-sm text-[#666] hover:text-[#333]">
        ← Zurück zur Liste
      </Link>
      <h1 className="mt-4 mb-2 font-heading text-3xl font-bold text-[#333]">
        {autor.vorname} {autor.nachname}
      </h1>
      <p className="mb-8 text-sm text-[#666]">{autor.rolle}</p>
      <RedaktionForm autor={autor} autorId={params.id} action={updateAction} />
    </div>
  )
}
