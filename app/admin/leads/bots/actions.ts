'use server'

/**
 * Admin server actions for Bot-Versuche (quarantine recover).
 */
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { recoverBotAttempt } from '@/lib/leads/recover-bot-attempt'
import type { ActionResult } from '@/lib/supabase/types'

async function requireAuth() {
  const authClient = createClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()
  return user
}

/**
 * Promote one quarantine row into a real lead (Convexa + mails when configured).
 */
export async function recoverBotAttemptAction(
  attemptId: string,
): Promise<ActionResult<{ leadId: string; warnings: string[] }>> {
  const user = await requireAuth()
  if (!user) {
    return { success: false, error: 'Nicht authentifiziert.' }
  }

  const id = (attemptId ?? '').trim()
  if (!id) {
    return { success: false, error: 'Keine Attempt-ID.' }
  }

  const result = await recoverBotAttempt(id)
  if (!result.ok) {
    return { success: false, error: result.error }
  }

  revalidatePath('/admin/leads/bots')
  revalidatePath('/admin/leads')
  revalidatePath(`/admin/leads/${result.leadId}`)

  return {
    success: true,
    data: { leadId: result.leadId, warnings: result.warnings },
  }
}
