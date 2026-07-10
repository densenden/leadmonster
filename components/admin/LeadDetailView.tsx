'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import type { ConvexaLeadPayload } from '@/lib/convexa/types'
import type { MetaLeadEventPreview, MetaPixelAdminConfig } from '@/lib/tracking/pixel-config'

type TabId = 'lead' | 'convexa' | 'pixel'

const TABS: { id: TabId; label: string }[] = [
  { id: 'lead', label: 'Lead-Daten' },
  { id: 'convexa', label: 'Convexa' },
  { id: 'pixel', label: 'Meta Pixel' },
]

const CONVEXA_HIGHLIGHT_FIELDS = new Set([
  'MonatsbeitragEur',
  'AkzeptierteWartezeitMonate',
  'GewuenschteWartezeit',
  'Address',
  'Street',
  'Zip',
  'City',
  'InsuredAmount',
  'GewuenschterAnbieter',
])

function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(iso))
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatEurDecimal(amount: number): string {
  return `${amount.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`
}

function display(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

function DetailSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <h2 className="px-5 py-3 text-sm font-semibold uppercase tracking-wider text-[#666666] bg-gray-50 border-b border-gray-200">
        {title}
      </h2>
      <dl className="divide-y divide-gray-100">{children}</dl>
    </section>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 px-5 py-3 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-[#666666]">{label}</dt>
      <dd className="text-sm text-[#333333] break-words">{value}</dd>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'rounded-t-md px-4 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'border-b-2 border-[#1a365d] text-[#1a365d] bg-white'
          : 'text-[#666666] hover:bg-gray-100 hover:text-[#333333]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export interface LeadDetailData {
  id: string
  vorname: string | null
  nachname: string | null
  email: string
  telefon: string | null
  geburtsdatum: string | null
  strasse: string | null
  plz: string | null
  ort: string | null
  interesse: string | null
  intent_tag: string | null
  zielgruppe_tag: string | null
  gewuenschter_anbieter: string | null
  sterbegeld_summe: number | null
  monatsbeitrag_eur: number | null
  akzeptierte_wartezeit_monate: number | null
  berufsklasse: string | null
  filter_kontext: Record<string, unknown> | null
  source_url: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  convexa_synced: boolean
  convexa_lead_id: string | null
  convexa_error: string | null
  resend_sent: boolean
  privacy_consent_at: string | null
  privacy_policy_version: string | null
  marketing_consent: boolean
  marketing_consent_at: string | null
  created_at: string
  produkte: { name: string; slug: string; typ: string } | null
}

export interface LeadDetailViewProps {
  lead: LeadDetailData
  convexaPayload: ConvexaLeadPayload
  pixelConfig: MetaPixelAdminConfig
  metaLeadPreview: MetaLeadEventPreview
}

export function LeadDetailView({
  lead,
  convexaPayload,
  pixelConfig,
  metaLeadPreview,
}: LeadDetailViewProps) {
  const [tab, setTab] = useState<TabId>('lead')

  const fullName = [lead.vorname, lead.nachname].filter(Boolean).join(' ') || 'Unbekannt'
  const addressLine = [lead.strasse, [lead.plz, lead.ort].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')

  const formPlacement =
    lead.filter_kontext &&
    typeof lead.filter_kontext.form_placement === 'string'
      ? lead.filter_kontext.form_placement
      : null

  const filterKontextRest =
    lead.filter_kontext && Object.keys(lead.filter_kontext).length > 0
      ? JSON.stringify(
          Object.fromEntries(
            Object.entries(lead.filter_kontext).filter(([k]) => k !== 'form_placement'),
          ),
          null,
          2,
        )
      : null

  const convexaEntries = Object.entries(convexaPayload).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/leads" className="text-sm text-[#666666] hover:text-[#333333]">
          ← Zurück zur Übersicht
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl text-[#333333]">{fullName}</h1>
            <p className="mt-1 text-sm text-[#666666]">
              Eingegangen am {formatTimestamp(lead.created_at)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={lead.convexa_synced ? 'success' : 'danger'}>
              Convexa: {lead.convexa_synced ? 'Sync OK' : 'Nicht sync'}
            </Badge>
            <Badge variant={lead.resend_sent ? 'success' : 'neutral'}>
              E-Mail: {lead.resend_sent ? 'Gesendet' : 'Offen'}
            </Badge>
          </div>
        </div>
      </div>

      <nav
        className="flex flex-wrap gap-1 border-b border-gray-200"
        role="tablist"
        aria-label="Lead-Detail-Ansichten"
      >
        {TABS.map(t => (
          <TabButton key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </TabButton>
        ))}
      </nav>

      {tab === 'lead' ? (
        <div className="space-y-6" role="tabpanel">
          <DetailSection title="Kontakt">
            <DetailRow label="Vorname" value={display(lead.vorname)} />
            <DetailRow label="Nachname" value={display(lead.nachname)} />
            <DetailRow
              label="E-Mail"
              value={
                <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
                  {lead.email}
                </a>
              }
            />
            <DetailRow
              label="Telefon"
              value={
                lead.telefon ? (
                  <a href={`tel:${lead.telefon}`} className="text-blue-600 hover:underline">
                    {lead.telefon}
                  </a>
                ) : (
                  '—'
                )
              }
            />
            <DetailRow
              label="Geburtsdatum"
              value={lead.geburtsdatum ? formatDate(lead.geburtsdatum) : '—'}
            />
            <DetailRow label="Straße" value={display(lead.strasse)} />
            <DetailRow label="PLZ" value={display(lead.plz)} />
            <DetailRow label="Ort" value={display(lead.ort)} />
            <DetailRow label="Adresse (kombiniert)" value={addressLine || '—'} />
          </DetailSection>

          <DetailSection title="Anfrage & Rechner">
            <DetailRow label="Produkt" value={lead.produkte?.name ?? '—'} />
            <DetailRow
              label="Produkt-Link"
              value={
                lead.produkte?.slug ? (
                  <Link href={`/${lead.produkte.slug}`} className="text-blue-600 hover:underline">
                    /{lead.produkte.slug}
                  </Link>
                ) : (
                  '—'
                )
              }
            />
            <DetailRow label="Formular-Kontext" value={display(formPlacement)} />
            <DetailRow label="Intent" value={display(lead.intent_tag)} />
            <DetailRow label="Zielgruppe" value={display(lead.zielgruppe_tag)} />
            <DetailRow label="Gewünschter Anbieter" value={display(lead.gewuenschter_anbieter)} />
            <DetailRow
              label="Versicherungssumme"
              value={lead.sterbegeld_summe != null ? formatEur(lead.sterbegeld_summe) : '—'}
            />
            <DetailRow
              label="Monatsbeitrag (Rechner)"
              value={
                lead.monatsbeitrag_eur != null ? formatEurDecimal(lead.monatsbeitrag_eur) : '—'
              }
            />
            <DetailRow
              label="Akzeptierte Wartezeit"
              value={
                lead.akzeptierte_wartezeit_monate != null
                  ? `${lead.akzeptierte_wartezeit_monate} Monate`
                  : '—'
              }
            />
            <DetailRow label="Berufsklasse" value={display(lead.berufsklasse)} />
            <DetailRow
              label="Interesse / Notiz"
              value={
                lead.interesse ? (
                  <span className="whitespace-pre-wrap">{lead.interesse}</span>
                ) : (
                  '—'
                )
              }
            />
          </DetailSection>

          <DetailSection title="DSGVO / Einwilligung">
            <DetailRow
              label="Datenschutz-Einwilligung"
              value={
                lead.privacy_consent_at
                  ? `Ja — ${formatTimestamp(lead.privacy_consent_at)}`
                  : '—'
              }
            />
            <DetailRow
              label="Datenschutz-Version"
              value={display(lead.privacy_policy_version)}
            />
            <DetailRow
              label="Marketing-Einwilligung"
              value={
                lead.marketing_consent
                  ? lead.marketing_consent_at
                    ? `Ja — ${formatTimestamp(lead.marketing_consent_at)}`
                    : 'Ja'
                  : 'Nein'
              }
            />
          </DetailSection>

          <DetailSection title="Tracking & Sync">
            <DetailRow
              label="Quell-URL"
              value={
                lead.source_url ? (
                  <a
                    href={lead.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {lead.source_url}
                  </a>
                ) : (
                  '—'
                )
              }
            />
            <DetailRow label="UTM Source" value={display(lead.utm_source)} />
            <DetailRow label="UTM Medium" value={display(lead.utm_medium)} />
            <DetailRow label="UTM Campaign" value={display(lead.utm_campaign)} />
            <DetailRow label="Convexa Sync" value={lead.convexa_synced ? 'Ja' : 'Nein'} />
            <DetailRow label="Convexa Lead-ID" value={display(lead.convexa_lead_id)} />
            <DetailRow
              label="Convexa Fehler"
              value={
                lead.convexa_error ? (
                  <span className="text-red-600 font-mono text-xs">{lead.convexa_error}</span>
                ) : (
                  '—'
                )
              }
            />
            <DetailRow
              label="Bestätigungs-Mail"
              value={lead.resend_sent ? 'Gesendet' : 'Nicht gesendet'}
            />
          </DetailSection>

          {filterKontextRest && filterKontextRest !== '{}' ? (
            <DetailSection title="Weitere Filter (filter_kontext)">
              <div className="px-5 py-3">
                <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-[#333333] font-mono">
                  {filterKontextRest}
                </pre>
              </div>
            </DetailSection>
          ) : null}
        </div>
      ) : null}

      {tab === 'convexa' ? (
        <div className="space-y-6" role="tabpanel">
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-[#1a365d]">
            <p className="font-medium">An Convexa gesendetes Payload (Schema {convexaPayload.FormVersion})</p>
            <p className="mt-1 text-[#4a5568]">
              Felder mit gelbem Hintergrund sollten in Convexa der Kampagnen-Form zugeordnet sein —
              sonst landen die Werte in der API, werden aber in der Oberfläche nicht angezeigt.
            </p>
          </div>

          <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-[#666666]">Feld (PascalCase)</th>
                  <th className="px-5 py-3 text-left font-semibold text-[#666666]">Wert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {convexaEntries.map(([key, value]) => {
                  const highlight = CONVEXA_HIGHLIGHT_FIELDS.has(key)
                  const displayValue =
                    value === '' ? (
                      <span className="text-[#999999] italic">leer</span>
                    ) : key === 'FilterKontext' ? (
                      <pre className="overflow-x-auto font-mono text-xs whitespace-pre-wrap">
                        {value}
                      </pre>
                    ) : (
                      <span className="break-words">{value}</span>
                    )
                  return (
                    <tr key={key} className={highlight ? 'bg-amber-50/80' : undefined}>
                      <td className="px-5 py-3 font-mono text-xs text-[#1a365d] align-top">{key}</td>
                      <td className="px-5 py-3 text-[#333333] align-top">{displayValue}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>

          <DetailSection title="Sync-Status">
            <DetailRow label="LeadSource" value={convexaPayload.LeadSource} />
            <DetailRow label="FormPlacement" value={display(convexaPayload.FormPlacement)} />
            <DetailRow label="Sync in DB" value={lead.convexa_synced ? 'Erfolgreich' : 'Fehlgeschlagen / ausstehend'} />
            <DetailRow label="Fehler" value={display(lead.convexa_error)} />
          </DetailSection>
        </div>
      ) : null}

      {tab === 'pixel' ? (
        <div className="space-y-6" role="tabpanel">
          <DetailSection title="Konfiguration">
            <DetailRow label="Pixel-ID" value={<span className="font-mono">{pixelConfig.pixelId}</span>} />
            <DetailRow label="Umgebungsvariable" value={<span className="font-mono">{pixelConfig.envVar}</span>} />
            <DetailRow label="Cookie-Kategorie" value="Marketing (Opt-in im Banner)" />
            <DetailRow
              label="Events Manager"
              value={
                <a
                  href={pixelConfig.eventsManagerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  In Meta öffnen
                </a>
              }
            />
          </DetailSection>

          <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <h2 className="px-5 py-3 text-sm font-semibold uppercase tracking-wider text-[#666666] bg-gray-50 border-b border-gray-200">
              Events auf der Webseite
            </h2>
            <div className="divide-y divide-gray-100">
              {pixelConfig.events.map(ev => (
                <div key={ev.name} className="px-5 py-4">
                  <p className="font-medium text-[#333333]">
                    <span className="font-mono text-[#1a365d]">{ev.name}</span>
                    <span className="ml-2 text-xs font-normal text-[#999999]">Standard-Event</span>
                  </p>
                  <p className="mt-1 text-sm text-[#666666]">
                    <span className="font-medium">Auslöser:</span> {ev.trigger}
                  </p>
                  <p className="mt-1 text-sm text-[#666666]">{ev.adminHint}</p>
                </div>
              ))}
            </div>
          </section>

          <DetailSection title="Lead-Event für diesen Datensatz (Vorschau)">
            <DetailRow label="Event" value={<span className="font-mono">{metaLeadPreview.event}</span>} />
            <DetailRow label="Hinweis" value={metaLeadPreview.note} />
            <div className="px-5 py-3">
              <p className="text-sm font-medium text-[#666666] mb-2">Parameter (fbq)</p>
              <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs font-mono text-[#333333]">
                {JSON.stringify(metaLeadPreview.parameters, null, 2)}
              </pre>
            </div>
          </DetailSection>
        </div>
      ) : null}

      <p className="text-xs text-[#999999]">Lead-ID: {lead.id}</p>
    </div>
  )
}
