import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockRequireAdminUser = vi.fn()
const mockRevalidateRedaktionDependents = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

vi.mock('@/lib/supabase/require-admin', () => ({
  requireAdminUser: () => mockRequireAdminUser(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/redaktion/revalidate', () => ({
  revalidateRedaktionDependents: (...args: unknown[]) =>
    mockRevalidateRedaktionDependents(...args),
}))

const VALID = {
  slug: 'christian-wimmer',
  vorname: 'Christian',
  nachname: 'Wimmer',
  titel: '',
  rolle: 'Versicherungsmakler & Inhaber sterbegeld24plus.de',
  kurz_bio:
    'Versicherungsmakler mit über 20 Jahren Erfahrung in Sterbegeld und Vorsorge für die Generation 50+.',
  lang_bio_md:
    '## Über Christian Wimmer\n\nLangform mit ausreichend Zeichen für die Validierung im Admin-Formular und in den Server-Actions.',
  expertise: 'sterbegeld',
  qualifikationen: '§ 34d Abs. 1 GewO Versicherungsmakler, BKV-Experte',
  vermittlerregister_nr: 'D-F-155-HL9G-55',
  ihk_kammer: 'IHK für München und Oberbayern',
  paragraph_34d: '§ 34d Abs. 1 GewO Versicherungsmakler',
  jahre_erfahrung: '20',
  email: '',
  telefon: '',
  linkedin_url: 'https://www.linkedin.com/in/christian-wimmer-5708b9193/',
  xing_url: '',
  website_url: 'https://www.sterbegeld24plus.de/',
  foto_alt: 'Christian Wimmer, Versicherungsmakler und Inhaber von sterbegeld24plus.de',
  public: 'on',
}

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.append(key, value)
  return fd
}

describe('redaktion actions — updateAutor', () => {
  beforeEach(() => {
    vi.resetModules()
    mockRequireAdminUser.mockResolvedValue({ id: 'admin-1', email: 'a@test.de' })
    mockRevalidateRedaktionDependents.mockResolvedValue(undefined)
  })

  it('rejects unauthenticated saves with a clear error', async () => {
    mockRequireAdminUser.mockResolvedValue(null)
    const { updateAutor } = await import('../actions')
    const result = await updateAutor('autor-1', makeFormData(VALID))
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/autorisiert/i)
  })

  it('persists changes when session is valid', async () => {
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'autor-1' }, error: null }),
        }),
      }),
    })
    const selectExisting = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            foto_url: '/foto.webp',
            foto_alt: 'alt',
            slug: 'christian-wimmer',
          },
          error: null,
        }),
      }),
    })
    mockFrom.mockReturnValue({ select: selectExisting, update })

    const { updateAutor } = await import('../actions')
    const result = await updateAutor('autor-1', makeFormData(VALID))

    expect(result.success).toBe(true)
    expect(update).toHaveBeenCalled()
    expect(mockRevalidateRedaktionDependents).toHaveBeenCalledWith(
      'autor-1',
      'christian-wimmer',
    )
  })
})
