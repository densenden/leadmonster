// Tests für lib/anthropic/post-processor.ts — fokussiert auf den
// Ratgeber-Cover-Bild-Pfad (neue Funktion ab 2026-05-01) und das
// Hero-Bild-Skipping bei bereits gesetzter URL.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// State + Mocks
// ---------------------------------------------------------------------------

interface RatgeberContent {
  sections: Array<Record<string, unknown>>
}

interface RatgeberRow {
  id: string
  slug: string
  content: RatgeberContent | null
  title: string | null
}

const state: {
  produkt: Record<string, unknown> | null
  ratgeberRows: RatgeberRow[]
  ratgeberSlugsForLinker: string[]
  produkteUpdates: Array<Record<string, unknown>>
  contentUpdates: Array<{ id: string; payload: Record<string, unknown> }>
} = {
  produkt: null,
  ratgeberRows: [],
  ratgeberSlugsForLinker: [],
  produkteUpdates: [],
  contentUpdates: [],
}

const generateImageMock = vi.fn()

vi.mock('@/lib/openai/image-generator', () => ({
  generateImage: generateImageMock,
}))

vi.mock('@/lib/openai/hero-prompt', async () => {
  const actual = await vi.importActual<typeof import('../../openai/hero-prompt')>(
    '../../openai/hero-prompt',
  )
  return actual
})

vi.mock('@/lib/openai/section-prompt', async () => {
  const actual = await vi.importActual<typeof import('../../openai/section-prompt')>(
    '../../openai/section-prompt',
  )
  return actual
})

vi.mock('@/lib/linker/auto-link', () => ({
  loadLinker: vi.fn().mockResolvedValue({ linkify: (s: string) => s }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: (table: string) => buildBuilder(table),
  }),
}))

function buildBuilder(table: string) {
  if (table === 'produkte') {
    return {
      select: () => ({
        eq: () => ({
          single: async () => ({ data: state.produkt, error: null }),
        }),
      }),
      update: (payload: Record<string, unknown>) => ({
        eq: async () => {
          state.produkteUpdates.push(payload)
          return { data: null, error: null }
        },
      }),
    }
  }
  if (table === 'generierter_content') {
    return {
      // Pfad 1: select(...).eq(...).eq(...).eq(...).not(...) — für Auto-Linker (nur slug)
      // Pfad 2: select(...).eq('produkt_id', ...) — für Linkifier-Loop (id, content)
      // Pfad 3: select(...).eq(...).eq(...).single() — für Hauptseite-Hero-Update
      // Pfad 4: select(...).eq('produkt_id', ...).eq('page_type', 'ratgeber') — für Ratgeber-Cover
      // Pfad 5: update(...).eq('id', ...) — für Sections-Update
      select: () => {
        let isRatgeberQuery = false
        let isLinkerQuery = false
        const builder: Record<string, unknown> = {}
        builder.eq = (col: string, val: unknown) => {
          if (col === 'page_type' && val === 'ratgeber') isRatgeberQuery = true
          if (col === 'status' && val === 'publiziert') isLinkerQuery = true
          return builder
        }
        builder.not = () => builder
        // Promise-like: wenn als Resolver verwendet
        builder.then = (resolve: (v: unknown) => unknown) => {
          if (isLinkerQuery) {
            return Promise.resolve({
              data: state.ratgeberSlugsForLinker.map(slug => ({ slug })),
              error: null,
            }).then(resolve)
          }
          if (isRatgeberQuery) {
            return Promise.resolve({ data: state.ratgeberRows, error: null }).then(resolve)
          }
          // Default: alle Rows für den Linkifier-Loop
          return Promise.resolve({
            data: state.ratgeberRows.map(r => ({ id: r.id, content: r.content })),
            error: null,
          }).then(resolve)
        }
        builder.single = async () => ({ data: null, error: null })
        return builder
      },
      update: (payload: Record<string, unknown>) => ({
        eq: async (_col: string, id: string) => {
          state.contentUpdates.push({ id, payload })
          return { data: null, error: null }
        },
      }),
    }
  }
  return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }
}

beforeEach(() => {
  state.produkt = null
  state.ratgeberRows = []
  state.ratgeberSlugsForLinker = []
  state.produkteUpdates = []
  state.contentUpdates = []
  generateImageMock.mockReset()
  generateImageMock.mockResolvedValue({
    url: 'https://cdn/img.png',
    alt: 'Test',
    width: 1536,
    height: 1024,
  })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('postProcessProduct — Ratgeber-Cover-Bilder', () => {
  it('generiert ein Cover-Bild pro Ratgeber-intro ohne image_url', async () => {
    state.produkt = {
      id: 'p-1',
      name: 'Sterbegeld24Plus',
      slug: 'sterbegeld24plus',
      typ: 'sterbegeld',
      hero_image_url: 'https://cdn/hero.png', // Hero-Block überspringen
      style_description: null,
      produkt_config: [{ zielgruppe: ['senioren_50plus'], fokus: 'sicherheit' }],
    }
    state.ratgeberRows = [
      {
        id: 'r-1',
        slug: 'wartezeit',
        title: 'Wartezeit verstehen',
        content: {
          sections: [
            { type: 'intro', text: 'Was ist die Wartezeit?' },
            { type: 'body', heading: 'Mehr', paragraphs: ['Mehr Text'] },
          ],
        },
      },
      {
        id: 'r-2',
        slug: 'unfalltod',
        title: 'Schutz bei Unfalltod',
        content: {
          sections: [{ type: 'intro', text: 'Sofort geschützt' }],
        },
      },
    ]

    const { postProcessProduct } = await import('../post-processor')
    const result = await postProcessProduct('p-1')

    expect(result.errors).toEqual([])
    expect(result.ratgeberCoversGenerated).toBe(2)
    expect(generateImageMock).toHaveBeenCalledTimes(2)

    // Beide Calls verwenden slot=hero und pageType=ratgeber
    for (const call of generateImageMock.mock.calls) {
      const args = call[0] as { slot: string; pageType: string; produktId: string; prompt: string }
      expect(args.slot).toBe('hero')
      expect(args.pageType).toBe('ratgeber')
      expect(args.produktId).toBe('p-1')
      expect(args.prompt.toLowerCase()).toContain('color palette')
      expect(args.prompt.toLowerCase()).toContain('intro')
    }

    // Mindestens 2 Content-Updates, in denen die intro-Section jetzt
    // ein image_url=https://cdn/img.png trägt (Auto-Linker triggert ggf.
    // weitere Updates, die wir hier nicht zählen).
    const introUpdates = state.contentUpdates.filter(u => {
      const sections = (u.payload.content as { sections: Array<{ type: string; image_url?: string }> } | undefined)?.sections
      const intro = sections?.find(s => s.type === 'intro')
      return intro?.image_url === 'https://cdn/img.png'
    })
    expect(introUpdates.length).toBeGreaterThanOrEqual(2)
  })

  it('überspringt Ratgeber, deren intro bereits ein image_url hat', async () => {
    state.produkt = {
      id: 'p-1',
      name: 'P',
      slug: 's',
      typ: 'sterbegeld',
      hero_image_url: 'https://cdn/hero.png',
      style_description: null,
      produkt_config: [],
    }
    state.ratgeberRows = [
      {
        id: 'r-1',
        slug: 'a',
        title: 'A',
        content: {
          sections: [{ type: 'intro', text: 'X', image_url: 'https://cdn/already.png' }],
        },
      },
    ]

    const { postProcessProduct } = await import('../post-processor')
    const result = await postProcessProduct('p-1')

    expect(result.ratgeberCoversGenerated).toBe(0)
    expect(generateImageMock).not.toHaveBeenCalled()
  })

  it('generiert kein Cover, wenn keine intro-Section in der Ratgeber-Row liegt', async () => {
    state.produkt = {
      id: 'p-1',
      name: 'P',
      slug: 's',
      typ: 'sterbegeld',
      hero_image_url: 'https://cdn/hero.png',
      style_description: null,
      produkt_config: [],
    }
    state.ratgeberRows = [
      { id: 'r-1', slug: 'a', title: 'A', content: { sections: [{ type: 'body', heading: 'X', paragraphs: [] }] } },
    ]

    const { postProcessProduct } = await import('../post-processor')
    const result = await postProcessProduct('p-1')

    expect(result.ratgeberCoversGenerated).toBe(0)
    expect(generateImageMock).not.toHaveBeenCalled()
  })

  it('Bildgenerierungs-Fehler an einem Ratgeber stoppt die anderen nicht', async () => {
    state.produkt = {
      id: 'p-1',
      name: 'P',
      slug: 's',
      typ: 'sterbegeld',
      hero_image_url: 'https://cdn/hero.png',
      style_description: null,
      produkt_config: [],
    }
    state.ratgeberRows = [
      { id: 'r-1', slug: 'fail', title: 'F', content: { sections: [{ type: 'intro', text: 'A' }] } },
      { id: 'r-2', slug: 'ok', title: 'O', content: { sections: [{ type: 'intro', text: 'B' }] } },
    ]
    generateImageMock
      .mockRejectedValueOnce(new Error('OpenAI 429'))
      .mockResolvedValueOnce({ url: 'https://cdn/ok.png', alt: 'ok', width: 1536, height: 1024 })

    const { postProcessProduct } = await import('../post-processor')
    const result = await postProcessProduct('p-1')

    expect(result.ratgeberCoversGenerated).toBe(1)
    expect(result.errors.some(e => e.includes('Ratgeber-Cover fail'))).toBe(true)
  })

  it('respektiert generateImages=false (kein Bild-Call)', async () => {
    state.produkt = {
      id: 'p-1',
      name: 'P',
      slug: 's',
      typ: 'sterbegeld',
      hero_image_url: null,
      style_description: null,
      produkt_config: [],
    }
    state.ratgeberRows = [
      { id: 'r-1', slug: 'a', title: 'A', content: { sections: [{ type: 'intro', text: 'X' }] } },
    ]

    const { postProcessProduct } = await import('../post-processor')
    await postProcessProduct('p-1', { generateImages: false })

    expect(generateImageMock).not.toHaveBeenCalled()
  })
})
