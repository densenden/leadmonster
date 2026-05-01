// Neuanlage eines Autors.
import Link from 'next/link'
import { RedaktionForm } from '@/components/admin/RedaktionForm'
import { createAutor } from '@/app/admin/redaktion/actions'

export default function NeuAutorPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/redaktion" className="text-sm text-[#666] hover:text-[#333]">
        ← Zurück zur Liste
      </Link>
      <h1 className="mt-4 mb-2 font-heading text-3xl font-bold text-[#333]">Neuen Autor anlegen</h1>
      <p className="mb-8 text-sm text-[#666]">
        Foto-Upload ist nach dem ersten Speichern verfügbar.
      </p>
      <RedaktionForm action={createAutor} />
    </div>
  )
}
