'use client'

/**
 * Client button: promote quarantine row → real lead.
 * Shows confirm, then calls recoverBotAttemptAction.
 */
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { recoverBotAttemptAction } from '@/app/admin/leads/bots/actions'

interface RecoverButtonProps {
  attemptId: string
  alreadyRecovered: boolean
  recoveredLeadId?: string | null
  labelName: string
}

export function RecoverButton({
  attemptId,
  alreadyRecovered,
  recoveredLeadId,
  labelName,
}: RecoverButtonProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [doneLeadId, setDoneLeadId] = useState<string | null>(
    recoveredLeadId ?? null,
  )

  if (alreadyRecovered || doneLeadId) {
    const leadId = doneLeadId ?? recoveredLeadId
    return (
      <div className="text-xs">
        <span className="rounded bg-green-100 px-2 py-0.5 font-medium text-green-800">
          Freigegeben
        </span>
        {leadId && (
          <a
            href={`/admin/leads/${leadId}`}
            className="mt-1 block text-[#02a9e6] hover:underline"
          >
            Zum Lead →
          </a>
        )}
      </div>
    )
  }

  function onRecover() {
    const ok = window.confirm(
      `Diesen Bot-Versuch als echten Lead freigeben?\n\n${labelName}\n\nEs wird ein Lead angelegt und (wenn aktiv) an Convexa + E-Mail gesendet.`,
    )
    if (!ok) return

    setError(null)
    startTransition(async () => {
      const result = await recoverBotAttemptAction(attemptId)
      if (!result.success || !result.data) {
        setError(result.error ?? 'Freigabe fehlgeschlagen.')
        return
      }
      setDoneLeadId(result.data.leadId)
      if (result.data.warnings.length > 0) {
        window.alert(`Freigegeben.\n\nHinweise:\n- ${result.data.warnings.join('\n- ')}`)
      }
      router.refresh()
    })
  }

  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={onRecover}
        disabled={pending}
        className="rounded bg-[#1a365d] px-2.5 py-1.5 font-medium text-white disabled:opacity-60"
      >
        {pending ? '…' : 'Als Lead freigeben'}
      </button>
      {error && <p className="mt-1 text-red-700">{error}</p>}
    </div>
  )
}
