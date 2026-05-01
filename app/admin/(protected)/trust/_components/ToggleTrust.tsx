'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleAktiv } from '@/app/admin/trust/actions'

export function ToggleTrust({ id, value }: { id: string; value: boolean }) {
  const [optimistic, setOptimistic] = useState(value)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => {
        const next = !optimistic
        setOptimistic(next)
        startTransition(async () => {
          const res = await toggleAktiv(id, next)
          if (!res.success) {
            setOptimistic(value)
            alert(res.error ?? 'Toggle fehlgeschlagen')
          } else router.refresh()
        })
      }}
      disabled={isPending}
      className={`text-xs px-2 py-1 rounded-full border transition ${
        optimistic
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-gray-100 text-gray-500 border-gray-200'
      }`}
    >
      {optimistic ? 'aktiv' : 'inaktiv'}
    </button>
  )
}
