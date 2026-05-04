// New product page — Server Component.
// Renders ProduktForm in create mode. Redirect on save is handled inside the form.
// Auth guard is inherited from app/admin/(protected)/layout.tsx.
import { ProduktForm } from '@/components/admin/ProduktForm'
import { listActiveProduktTypen } from '@/lib/tarife/produkt-config-db'

export default async function NeuesProduktPage() {
  const typen = await listActiveProduktTypen()
  const typOptions = typen.map(t => ({ value: t.slug, label: t.name }))

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-[#333333]">
          Neues Produkt anlegen
        </h1>
        <p className="mt-1 text-sm text-[#666666]">
          Füllen Sie alle Felder aus und klicken Sie auf &bdquo;Produkt speichern&ldquo;.
        </p>
      </div>

      <ProduktForm mode="create" typOptions={typOptions} />
    </div>
  )
}
