import Link from 'next/link'
import { ProduktTypForm } from '../_components/ProduktTypForm'

export default function NeueVersicherungsartPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <nav className="mb-6 text-sm text-[#999]">
        <Link href="/admin/produkt-typen" className="hover:text-[#1a365d] hover:underline">
          Versicherungsarten
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#333]">Neu</span>
      </nav>
      <h1 className="mb-8 font-heading text-3xl font-bold text-[#333]">
        Neue Versicherungsart anlegen
      </h1>
      <ProduktTypForm mode="create" />
    </div>
  )
}
