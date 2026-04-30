// Tests für components/sections/VergleichsRechner.tsx.
// Verifiziert: Initial-Render mit initialData, fetch-Trigger bei Input-Wechsel,
// Klick auf Anbieter-CTA → LeadForm + Hidden-Field gewuenschter_anbieter.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { VergleichsRechner } from '../VergleichsRechner'
import type { AnbieterTarif } from '@/lib/tarife/lookup'

const SAMPLE: AnbieterTarif[] = [
  {
    anbieter_name: 'DELA',
    tarif_name: 'sorgenfrei Leben',
    beitrag_eur: 17.14,
    besonderheiten: { wartezeit_monate: 0, doppelte_unfall: true, rueckholung: true, lebenslang: true },
    badges: ['guenstigster', 'schnellster_schutz', 'bester_schutz'],
  },
  {
    anbieter_name: 'November',
    tarif_name: 'Basic Plus',
    beitrag_eur: 17.52,
    besonderheiten: { wartezeit_monate: 12, doppelte_unfall: true, rueckholung: true },
    badges: [],
  },
  {
    anbieter_name: 'Allianz',
    tarif_name: 'Bestattungsschutzbrief',
    beitrag_eur: 19.8,
    besonderheiten: { wartezeit_monate: 12, doppelte_unfall: true, rueckholung: true, lebenslang: true },
    badges: [],
  },
]

const DEFAULT_PROPS = {
  produktId: 'prod-uuid-001',
  zielgruppeTag: 'senioren_50plus',
  intentTag: 'preis',
  headline: 'Sterbegeld24Plus im Anbieter-Vergleich',
  intro: 'Wir zeigen die Tarife von 5 Top-Anbietern.',
  ctaLabel: 'Beratung anfordern',
  initialData: SAMPLE,
}

beforeEach(() => {
  vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ data: SAMPLE, error: null }),
  } as Response)
})

describe('VergleichsRechner — initial render', () => {
  it('rendert headline und intro', () => {
    render(<VergleichsRechner {...DEFAULT_PROPS} />)
    expect(screen.getByText(/Sterbegeld24Plus im Anbieter-Vergleich/i)).toBeInTheDocument()
    expect(screen.getByText(/Wir zeigen die Tarife/i)).toBeInTheDocument()
  })

  it('rendert eine Zeile pro Anbieter mit data-testid', () => {
    render(<VergleichsRechner {...DEFAULT_PROPS} />)
    expect(screen.getByTestId('vr-row-dela')).toBeInTheDocument()
    expect(screen.getByTestId('vr-row-november')).toBeInTheDocument()
    expect(screen.getByTestId('vr-row-allianz')).toBeInTheDocument()
  })

  it('zeigt Badges für DELA (alle drei)', () => {
    render(<VergleichsRechner {...DEFAULT_PROPS} />)
    expect(screen.getByTestId('vr-badge-dela-guenstigster')).toBeInTheDocument()
    expect(screen.getByTestId('vr-badge-dela-schnellster_schutz')).toBeInTheDocument()
    expect(screen.getByTestId('vr-badge-dela-bester_schutz')).toBeInTheDocument()
  })

  it('zeigt Beträge im de-DE-Format', () => {
    render(<VergleichsRechner {...DEFAULT_PROPS} />)
    const dela = screen.getByTestId('vr-row-dela')
    expect(dela.textContent).toContain('17,14')
    const allianz = screen.getByTestId('vr-row-allianz')
    expect(allianz.textContent).toContain('19,80')
  })

  it('zeigt globalen CTA-Button', () => {
    render(<VergleichsRechner {...DEFAULT_PROPS} />)
    expect(screen.getByTestId('vr-cta-global')).toHaveTextContent(/Beratung anfordern/i)
  })

  it('zeigt LeadForm initial NICHT', () => {
    render(<VergleichsRechner {...DEFAULT_PROPS} />)
    expect(
      screen.queryByRole('button', { name: /Jetzt Angebot anfordern/i }),
    ).not.toBeInTheDocument()
  })
})

describe('VergleichsRechner — Eingabe-Wechsel triggert fetch', () => {
  it('fetcht /api/vergleich-tarife mit korrekten Query-Params bei Geburtsjahr-Wechsel', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
    render(<VergleichsRechner {...DEFAULT_PROPS} />)

    // Anfangs-fetch (initial useEffect)
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    fetchSpy.mockClear()

    const select = screen.getByLabelText(/Ihr Geburtsjahr/i)
    fireEvent.change(select, { target: { value: '1955' } })

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled()
      const url = fetchSpy.mock.calls[0]![0] as string
      expect(url).toContain(`age=${new Date().getFullYear() - 1955}`)
      expect(url).toContain('produktId=prod-uuid-001')
    })
  })

  it('fetcht mit korrektem summe-Param bei Summen-Wechsel', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
    render(<VergleichsRechner {...DEFAULT_PROPS} />)
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    fetchSpy.mockClear()

    // VergleichsRechner zieht das summe_label aus produkt-config; ohne explizites
    // produktTyp-Prop greift der Fallback "sterbegeld" → "Wunschsumme".
    const select = screen.getByLabelText(/Wunschsumme/i)
    fireEvent.change(select, { target: { value: '5000' } })

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled()
      const url = fetchSpy.mock.calls[0]![0] as string
      expect(url).toContain('summe=5000')
    })
  })
})

describe('VergleichsRechner — Anbieter-CTA → LeadForm', () => {
  it('Klick auf "DELA anfragen" zeigt LeadForm mit Hidden-Field', async () => {
    render(<VergleichsRechner {...DEFAULT_PROPS} />)

    fireEvent.click(screen.getByTestId('vr-cta-dela'))

    await waitFor(() => {
      expect(screen.getByTestId('leadform-anbieter-hint')).toBeInTheDocument()
      expect(screen.getByTestId('leadform-anbieter-hint')).toHaveTextContent('DELA')
    })

    // Hidden-Input ist vorhanden mit dem Anbieter-Namen
    const hidden = document.querySelector('input[name="gewuenschter_anbieter"]') as HTMLInputElement | null
    expect(hidden).not.toBeNull()
    expect(hidden!.value).toBe('DELA')
  })

  it('Klick auf globalen CTA zeigt LeadForm OHNE Hidden-Field', async () => {
    render(<VergleichsRechner {...DEFAULT_PROPS} />)

    fireEvent.click(screen.getByTestId('vr-cta-global'))

    await waitFor(() => {
      // Submit-Button der LeadForm ist sichtbar
      expect(screen.getByRole('button', { name: /Jetzt Angebot anfordern/i })).toBeInTheDocument()
    })

    // Kein Anbieter-Hinweis-Block
    expect(screen.queryByTestId('leadform-anbieter-hint')).not.toBeInTheDocument()
  })
})

describe('VergleichsRechner — Produkt-Typ-Adaptivität', () => {
  it('zeigt für produktTyp="pflege" das Label "Gewünschte Pflegerente" und Pflege-Summen', () => {
    render(<VergleichsRechner {...DEFAULT_PROPS} produktTyp="pflege" initialData={[]} />)
    const select = screen.getByLabelText(/Gewünschte Pflegerente/i) as HTMLSelectElement
    expect(select).toBeInTheDocument()
    const values = Array.from(select.options).map(o => o.value)
    expect(values).toContain('500')
    expect(values).toContain('1000')
    expect(values).toContain('3000')
    // Sterbegeld-Werte dürfen nicht im Pflege-Select erscheinen
    expect(values).not.toContain('8000')
  })

  it('zeigt für produktTyp="bu" das Label "Gewünschte BU-Rente" und BU-Summen', () => {
    render(<VergleichsRechner {...DEFAULT_PROPS} produktTyp="bu" initialData={[]} />)
    const select = screen.getByLabelText(/Gewünschte BU-Rente/i) as HTMLSelectElement
    const values = Array.from(select.options).map(o => o.value)
    expect(values).toContain('1500')
    expect(values).toContain('3000')
  })

  it('fällt bei unbekanntem produktTyp auf Sterbegeld-Konfig zurück', () => {
    render(<VergleichsRechner {...DEFAULT_PROPS} produktTyp="exotisch" initialData={[]} />)
    expect(screen.getByLabelText(/Wunschsumme/i)).toBeInTheDocument()
  })
})

describe('VergleichsRechner — defaultInteresse Prefill', () => {
  it('prefillt das Interesse-Textarea mit Anbieter+Tarif+Beitrag bei Anbieter-CTA', async () => {
    render(<VergleichsRechner {...DEFAULT_PROPS} produktName="Sterbegeld24Plus" />)
    fireEvent.click(screen.getByTestId('vr-cta-dela'))

    await waitFor(() => {
      const textarea = screen.getByLabelText(/Ihr Interesse/i) as HTMLTextAreaElement
      expect(textarea.value).toContain('DELA')
      expect(textarea.value).toContain('sorgenfrei Leben')
      expect(textarea.value).toContain('17,14')
    })
  })

  it('prefillt das Interesse-Textarea mit Produktname bei globalem CTA', async () => {
    render(<VergleichsRechner {...DEFAULT_PROPS} produktName="Sterbegeld24Plus" />)
    fireEvent.click(screen.getByTestId('vr-cta-global'))

    await waitFor(() => {
      const textarea = screen.getByLabelText(/Ihr Interesse/i) as HTMLTextAreaElement
      expect(textarea.value).toContain('Sterbegeld24Plus')
      expect(textarea.value).toContain('Beratungsanfrage')
    })
  })
})

describe('VergleichsRechner — leerer Datensatz', () => {
  it('zeigt Empty-State, wenn API leeres Array liefert', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], error: null }),
    } as Response)

    render(<VergleichsRechner {...DEFAULT_PROPS} initialData={[]} />)

    await waitFor(() => {
      expect(screen.getByTestId('vr-empty')).toBeInTheDocument()
    })
    // Globaler CTA wird in Empty-State NICHT gezeigt (kein sinnvoller Bezug)
    expect(screen.queryByTestId('vr-cta-global')).not.toBeInTheDocument()
  })
})
