import { describe, it, expect, vi, beforeEach } from 'vitest'
import { applyHeroImageToProdukt } from '@/lib/admin/apply-hero-image'

describe('applyHeroImageToProdukt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates produkte and patches hero section in hauptseite content', async () => {
    const updateContent = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'produkte') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'generierter_content') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'content-1',
                      content: {
                        sections: [
                          { type: 'hero', headline: 'Hi', image_url: null },
                          { type: 'features', items: [] },
                        ],
                      },
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: updateContent,
          }
        }
        throw new Error(`unexpected table ${table}`)
      }),
    }

    await applyHeroImageToProdukt(
      supabase as never,
      'produkt-1',
      'https://cdn.example/hero.jpg',
      'Hero alt',
    )

    expect(updateContent).toHaveBeenCalledWith({
      content: {
        sections: [
          {
            type: 'hero',
            headline: 'Hi',
            image_url: 'https://cdn.example/hero.jpg',
            image_alt: 'Hero alt',
          },
          { type: 'features', items: [] },
        ],
      },
    })
  })
})
