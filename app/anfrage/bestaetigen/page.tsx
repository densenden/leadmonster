// Public page opened from the confirm link in the lead email.
import { confirmLeadByToken, type ConfirmLeadResult } from '@/lib/leads/email-confirm'

export const dynamic = 'force-dynamic'

const COPY: Record<ConfirmLeadResult, { title: string; body: string }> = {
  confirmed: {
    title: 'E-Mail-Adresse bestätigt',
    body: 'Danke. Wir haben Ihre Adresse bestätigt und melden uns innerhalb von 24 Stunden.',
  },
  already: {
    title: 'Bereits bestätigt',
    body: 'Diese E-Mail-Adresse war schon bestätigt. Wir melden uns bei Ihnen.',
  },
  expired: {
    title: 'Link abgelaufen',
    body: 'Dieser Bestätigungslink ist abgelaufen. Bitte senden Sie das Formular erneut.',
  },
  invalid: {
    title: 'Link ungültig',
    body: 'Dieser Bestätigungslink ist ungültig. Bitte senden Sie das Formular erneut.',
  },
}

export default async function EmailBestaetigenPage({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  const result = await confirmLeadByToken(searchParams.token)
  const copy = COPY[result]

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <div className="bg-white p-8 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]">
        <h1 className="font-heading font-bold text-[#1a365d] text-2xl mb-3">{copy.title}</h1>
        <p className="font-body font-light text-[#666666]">{copy.body}</p>
      </div>
    </main>
  )
}
