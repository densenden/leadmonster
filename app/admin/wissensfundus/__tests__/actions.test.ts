// Server action unit tests for the Wissensfundus CRUD operations and AI read-path.
// All Supabase calls are mocked so these tests run without a live DB.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Supabase mock setup
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value)
  }
  return fd
}

// ---------------------------------------------------------------------------
// createArtikel tests
// ---------------------------------------------------------------------------

describe('createArtikel — validation', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@a.de' } } })
  })

  it('returns fieldErrors when thema is too short', async () => {
    // Provide a minimal query chain that never gets called (validation fails first)
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) })

    const { createArtikel } = await import('../actions')
    const fd = makeFormData({
      kategorie: 'allgemein',
      thema: 'ab', // too short — min 3
      inhalt: 'Ein ausreichend langer Inhalt für den Test.',
      tags: '',
    })

    const result = await createArtikel(fd)
    expect(result.success).toBe(false)
    expect(result.fieldErrors?.thema).toBeDefined()
  })

  it('returns fieldErrors when kategorie is invalid', async () => {
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) })

    const { createArtikel } = await import('../actions')
    const fd = makeFormData({
      kategorie: 'invalid',
      thema: 'Gültiges Thema',
      inhalt: 'Ein ausreichend langer Inhalt für den Test.',
      tags: '',
    })

    const result = await createArtikel(fd)
    expect(result.success).toBe(false)
    expect(result.fieldErrors?.kategorie).toBeDefined()
  })

  it('returns { success: true } on valid input', async () => {
    const mockInsertFn = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ insert: mockInsertFn })

    const { createArtikel } = await import('../actions')
    const fd = makeFormData({
      kategorie: 'sterbegeld',
      thema: 'Was ist Sterbegeld',
      inhalt: 'Sterbegeld ist eine Versicherungsleistung die im Todesfall ausgezahlt wird.',
      tags: 'grundlagen, senioren',
    })

    const result = await createArtikel(fd)
    expect(result.success).toBe(true)
    expect(mockInsertFn).toHaveBeenCalledOnce()
  })
})

describe('createArtikel — auth guard', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns not-authorized error when user is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockFrom.mockReturnValue({ insert: vi.fn() })

    const { createArtikel } = await import('../actions')
    const fd = makeFormData({
      kategorie: 'allgemein',
      thema: 'Thema test',
      inhalt: 'Langer genug inhalt für validation.',
      tags: '',
    })

    const result = await createArtikel(fd)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Nicht autorisiert')
  })
})

// ---------------------------------------------------------------------------
// deleteArtikel tests
// ---------------------------------------------------------------------------

describe('deleteArtikel', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@a.de' } } })
  })

  it('calls .delete().eq() with the correct id', async () => {
    const mockEqFn = vi.fn().mockResolvedValue({ error: null })
    const mockDeleteFn = vi.fn().mockReturnValue({ eq: mockEqFn })
    mockFrom.mockReturnValue({ delete: mockDeleteFn })

    const { deleteArtikel } = await import('../actions')
    const result = await deleteArtikel('article-id-123')

    expect(result.success).toBe(true)
    expect(mockDeleteFn).toHaveBeenCalledOnce()
    expect(mockEqFn).toHaveBeenCalledWith('id', 'article-id-123')
  })

  it('returns error when id is empty string', async () => {
    const { deleteArtikel } = await import('../actions')
    const result = await deleteArtikel('')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Ungültige ID')
  })
})

// ---------------------------------------------------------------------------
// updateArtikel tests
// ---------------------------------------------------------------------------

describe('updateArtikel', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@a.de' } } })
  })

  it('calls .update().eq() with updated fields and correct id', async () => {
    const mockEqFn = vi.fn().mockResolvedValue({ error: null })
    const mockUpdateFn = vi.fn().mockReturnValue({ eq: mockEqFn })
    mockFrom.mockReturnValue({ update: mockUpdateFn })

    const { updateArtikel } = await import('../actions')
    const fd = makeFormData({
      kategorie: 'pflege',
      thema: 'Pflegeversicherung Grundlagen',
      inhalt: 'Die Pflegeversicherung deckt Kosten bei Pflegebedürftigkeit ab.',
      tags: 'pflege, grundlagen',
    })

    const result = await updateArtikel('article-id-456', fd)

    expect(result.success).toBe(true)
    expect(mockUpdateFn).toHaveBeenCalledOnce()
    expect(mockEqFn).toHaveBeenCalledWith('id', 'article-id-456')
  })

  it('returns error when id is empty string', async () => {
    const { updateArtikel } = await import('../actions')
    const fd = makeFormData({ kategorie: 'allgemein', thema: 'Thema', inhalt: 'Inhalt lang genug hier.', tags: '' })
    const result = await updateArtikel('', fd)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Ungültige ID')
  })
})

// ---------------------------------------------------------------------------
// AI read-path: fetchWissensfundusKontext
// ---------------------------------------------------------------------------

describe('fetchWissensfundusKontext', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns a Markdown block containing thema when rows exist', async () => {
    const mockInFn = vi.fn().mockResolvedValue({
      data: [
        { thema: 'Was ist Sterbegeld', inhalt: 'Sterbegeld ist eine Versicherungsleistung.' },
        { thema: 'Allgemeine Infos', inhalt: 'Allgemeine Versicherungsinfos hier.' },
      ],
      error: null,
    })
    const mockSelectFn = vi.fn().mockReturnValue({ in: mockInFn })
    mockFrom.mockReturnValue({ select: mockSelectFn })

    const { fetchWissensfundusKontext } = await import('@/lib/anthropic/generator')
    const result = await fetchWissensfundusKontext('sterbegeld')

    expect(result).toContain('## Wissensfundus-Kontext')
    expect(result).toContain('### Was ist Sterbegeld')
    expect(result).toContain('Sterbegeld ist eine Versicherungsleistung.')
  })

  it('returns empty string when no rows found (does not throw)', async () => {
    const mockInFn = vi.fn().mockResolvedValue({ data: [], error: null })
    const mockSelectFn = vi.fn().mockReturnValue({ in: mockInFn })
    mockFrom.mockReturnValue({ select: mockSelectFn })

    const { fetchWissensfundusKontext } = await import('@/lib/anthropic/generator')
    const result = await fetchWissensfundusKontext('unfall')

    expect(result).toBe('')
  })

  it('returns empty string on query error and does not throw', async () => {
    const mockInFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const mockSelectFn = vi.fn().mockReturnValue({ in: mockInFn })
    mockFrom.mockReturnValue({ select: mockSelectFn })

    const { fetchWissensfundusKontext } = await import('@/lib/anthropic/generator')

    // Direct await — we verify no exception is thrown and the return value is ''
    const result = await fetchWissensfundusKontext('pflege')
    expect(result).toBe('')
  })
})
