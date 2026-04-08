// Edit existing Wissensfundus article page — Server Component.
// Fetches the article by id and renders the form in edit mode with pre-filled values.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import type { Wissensfundus } from '@/lib/supabase/types'
import { WissensfundusForm } from '@/components/admin/WissensfundusForm'
import { updateArtikel } from '@/app/admin/wissensfundus/actions'

interface PageProps {
  params: { id: string }
}

export default async function ArtikelBearbeitenPage({ params }: PageProps) {
  const supabase = createAdminClient()

  const { data: row } = await supabase
    .from('wissensfundus')
    .select('*')
    .eq('id', params.id)
    .single()

  // Redirect to 404 when the article does not exist.
  if (!row) {
    notFound()
  }

  const artikel: Wissensfundus = {
    ...row,
    tags: row.tags ?? [],
  }

  // Bind the article id into the server action so the form only needs to pass formData.
  const updateWithId = updateArtikel.bind(null, params.id)

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-[#999999]">
        <Link href="/admin/wissensfundus" className="hover:text-[#1a365d] hover:underline">
          Wissensfundus
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#333333]">Artikel bearbeiten</span>
      </nav>

      <h1 className="mb-8 font-heading text-3xl font-bold text-[#333333]">
        Artikel bearbeiten
      </h1>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <WissensfundusForm artikel={artikel} action={updateWithId} />
      </div>
    </div>
  )
}
