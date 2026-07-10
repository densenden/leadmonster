import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import type { Lead } from '@/lib/supabase/types'
import { buildPayload } from '@/lib/convexa/client'
import {
  buildMetaLeadEventPreview,
  getMetaPixelAdminConfig,
} from '@/lib/tracking/pixel-config'
import { LeadDetailView, type LeadDetailData } from '@/components/admin/LeadDetailView'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { id: string }
}

const LEAD_SELECT = `
  id,
  vorname,
  nachname,
  email,
  telefon,
  geburtsdatum,
  strasse,
  plz,
  ort,
  interesse,
  intent_tag,
  zielgruppe_tag,
  gewuenschter_anbieter,
  sterbegeld_summe,
  monatsbeitrag_eur,
  akzeptierte_wartezeit_monate,
  berufsklasse,
  filter_kontext,
  source_url,
  utm_source,
  utm_medium,
  utm_campaign,
  convexa_synced,
  convexa_lead_id,
  convexa_error,
  resend_sent,
  privacy_consent_at,
  privacy_policy_version,
  marketing_consent,
  marketing_consent_at,
  client_ip,
  created_at,
  produkte(name, slug, typ)
`

export default async function LeadDetailPage({ params }: PageProps) {
  const supabase = createAdminClient()

  const { data: lead, error } = await supabase
    .from('leads')
    .select(LEAD_SELECT)
    .eq('id', params.id)
    .maybeSingle()

  if (error || !lead) {
    notFound()
  }

  const row = lead as unknown as LeadDetailData
  const produkt = row.produkte

  const convexaPayload = buildPayload(lead as unknown as Lead, {
    produktName: produkt?.name ?? 'Unbekannt',
    produktSlug: produkt?.slug ?? '',
    produktTyp: produkt?.typ ?? '',
  })

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <LeadDetailView
        lead={row}
        convexaPayload={convexaPayload}
        pixelConfig={getMetaPixelAdminConfig()}
        metaLeadPreview={buildMetaLeadEventPreview(row)}
      />
    </div>
  )
}
