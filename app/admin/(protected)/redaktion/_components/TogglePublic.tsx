'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { togglePublic } from '@/app/admin/redaktion/actions'

export function TogglePublic({ id, value }: { id: string; value: boolean }) {
  const [optimistic, setOptimistic] = useState(value)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleToggle() {
    const next = !optimistic
    setOptimistic(next)
    startTransition(async () => {
      const res = await togglePublic(id, next)
      if (!res.success) {
        setOptimistic(value)
        alert(res.error ?? 'Toggle fehlgeschlagen')
      } else {
        router.refresh()
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`text-xs px-2 py-1 rounded-full border transition ${
        optimistic
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-gray-100 text-gray-500 border-gray-200'
      }`}
      aria-label={optimistic ? 'Öffentlich' : 'Versteckt'}
    >
      {optimistic ? 'Public' : 'Hidden'}
    </button>
  )
}
