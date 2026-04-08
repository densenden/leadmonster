// Create new Wissensfundus article page — Server Component wrapper.
// Renders the shared WissensfundusForm in create mode (no initial article data).
import Link from 'next/link'
import { WissensfundusForm } from '@/components/admin/WissensfundusForm'
import { createArtikel } from '@/app/admin/wissensfundus/actions'

export default function NeuenArtikelAnlegenPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-[#999999]">
        <Link href="/admin/wissensfundus" className="hover:text-[#1a365d] hover:underline">
          Wissensfundus
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#333333]">Neuer Artikel</span>
      </nav>

      <h1 className="mb-8 font-heading text-3xl font-bold text-[#333333]">
        Neuen Artikel anlegen
      </h1>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <WissensfundusForm action={createArtikel} />
      </div>
    </div>
  )
}
