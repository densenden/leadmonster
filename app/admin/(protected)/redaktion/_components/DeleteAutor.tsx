'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteAutor } from '@/app/admin/redaktion/actions'

export function DeleteAutor({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    if (!confirm(`"${name}" wirklich löschen? Bei verknüpften Artikeln wird der Autor auf NULL gesetzt.`)) return
    startTransition(async () => {
      const res = await deleteAutor(id)
      if (res.success) router.refresh()
      else alert(res.error ?? 'Löschen fehlgeschlagen')
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-xs text-red-600 hover:underline disabled:opacity-50"
    >
      {isPending ? 'Löscht…' : 'Löschen'}
    </button>
  )
}
