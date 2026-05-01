'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteTrust } from '@/app/admin/trust/actions'

export function DeleteTrust({ id, titel }: { id: string; titel: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm(`"${titel}" wirklich löschen?`)) return
        startTransition(async () => {
          const res = await deleteTrust(id)
          if (res.success) router.refresh()
          else alert(res.error ?? 'Löschen fehlgeschlagen')
        })
      }}
      disabled={isPending}
      className="text-xs text-red-600 hover:underline disabled:opacity-50"
    >
      {isPending ? 'Löscht…' : 'Löschen'}
    </button>
  )
}
