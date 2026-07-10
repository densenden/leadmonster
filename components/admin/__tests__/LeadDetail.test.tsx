import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { buildPayload } from '@/lib/convexa/client'
import { buildMetaLeadEventPreview, getMetaPixelAdminConfig } from '@/lib/tracking/pixel-config'
import { LeadDetailView, type LeadDetailData } from '../LeadDetailView'
import type { Lead } from '@/lib/supabase/types'

function makeLead(overrides: Partial<LeadDetailData> = {}): LeadDetailData {
  return {
    id: 'lead-1',
    vorname: 'Max',
    nachname: 'Mustermann',
    email: 'max@example.de',
    telefon: '+49 170 1234567',
    geburtsdatum: '1965-03-15',
    strasse: 'Musterstraße 12',
    plz: '80331',
    ort: 'München',
    interesse: 'Schnelle Beratung',
    intent_tag: 'preis',
    zielgruppe_tag: 'senioren',
    gewuenschter_anbieter: 'Allianz',
    sterbegeld_summe: 10000,
    monatsbeitrag_eur: 19.8,
    akzeptierte_wartezeit_monate: 12,
    berufsklasse: null,
    filter_kontext: { summe: 8000, form_placement: 'vergleichsrechner' },
    source_url: 'https://finanzteam26.de/sterbegeld24plus',
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'sterbegeld',
    convexa_synced: false,
    convexa_lead_id: null,
    convexa_error: 'CONVEXA_NETWORK_ERROR',
    resend_sent: true,
    privacy_consent_at: '2026-04-01T10:00:00.000Z',
    privacy_policy_version: '2026-07-10',
    marketing_consent: false,
    marketing_consent_at: null,
    client_ip: '203.0.113.7',
    created_at: '2026-04-01T10:00:00.000Z',
    produkte: { name: 'Sterbegeld24Plus', slug: 'sterbegeld24plus', typ: 'sterbegeld' },
    ...overrides,
  }
}

function renderView(overrides: Partial<LeadDetailData> = {}) {
  const lead = makeLead(overrides)
  const convexaPayload = buildPayload(lead as unknown as Lead, {
    produktName: lead.produkte?.name ?? 'Unbekannt',
    produktSlug: lead.produkte?.slug ?? '',
    produktTyp: lead.produkte?.typ ?? '',
  })
  return render(
    React.createElement(LeadDetailView, {
      lead,
      convexaPayload,
      pixelConfig: getMetaPixelAdminConfig(),
      metaLeadPreview: buildMetaLeadEventPreview(lead),
    }),
  )
}

describe('LeadDetailView', () => {
  it('renders contact and offer fields on lead tab', () => {
    renderView()

    expect(screen.getByRole('heading', { level: 1, name: 'Max Mustermann' })).toBeDefined()
    expect(screen.getByText('max@example.de')).toBeDefined()
    expect(screen.getByText('Musterstraße 12')).toBeDefined()
    expect(screen.getByText('80331')).toBeDefined()
    expect(screen.getByText('19,80 €')).toBeDefined()
    expect(screen.getByText('12 Monate')).toBeDefined()
    expect(screen.getByText('vergleichsrechner')).toBeDefined()
  })

  it('shows Convexa payload on convexa tab', () => {
    renderView()

    fireEvent.click(screen.getByRole('tab', { name: 'Convexa' }))
    expect(screen.getByText('MonatsbeitragEur')).toBeDefined()
    expect(screen.getByText('19.80')).toBeDefined()
    expect(screen.getByText('Musterstraße 12, 80331 München')).toBeDefined()
  })

  it('shows Meta Pixel config on pixel tab', () => {
    renderView()

    fireEvent.click(screen.getByRole('tab', { name: 'Meta Pixel' }))
    expect(screen.getByText('374844728246470')).toBeDefined()
    expect(screen.getByText('ViewContent')).toBeDefined()
    expect(screen.getByText(/content_name/)).toBeDefined()
  })

  it('links back to the leads overview', () => {
    renderView()

    const backLink = screen.getByRole('link', { name: '← Zurück zur Übersicht' })
    expect(backLink.getAttribute('href')).toBe('/admin/leads')
  })
})
