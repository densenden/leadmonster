// Gap coverage tests for Task Group 4.
// Covers auth guards for update/delete, tags parsing, and form-to-action boundary.
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
// Auth guard: updateArtikel
// ---------------------------------------------------------------------------

describe('updateArtikel — auth guard', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGetUser.mockResolvedValue({ data: { user: null } })
  })

  it('returns not-authorized error when user is null', async () => {
    const { updateArtikel } = await import('../actions')
    const fd = makeFormData({
      kategorie: 'allgemein',
      thema: 'Ein gültiges Thema',
      inhalt: 'Ein ausreichend langer Inhalt für den Test.',
      tags: '',
    })

    const result = await updateArtikel('some-id', fd)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Nicht autorisiert')
  })
})

// ---------------------------------------------------------------------------
// Auth guard: deleteArtikel
// ---------------------------------------------------------------------------

describe('deleteArtikel — auth guard', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGetUser.mockResolvedValue({ data: { user: null } })
  })

  it('returns not-authorized error when user is null', async () => {
    const { deleteArtikel } = await import('../actions')
    const result = await deleteArtikel('some-id')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Nicht autorisiert')
  })
})

// ---------------------------------------------------------------------------
// Tags parsing: comma-separated string correctly split to array
// ---------------------------------------------------------------------------

describe('createArtikel — tags parsing', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@a.de' } } })
  })

  it('parses comma-separated tags string into a trimmed array', async () => {
    let capturedInsertData: unknown = null
    const mockInsertFn = vi.fn().mockImplementation((data: unknown) => {
      capturedInsertData = data
      return Promise.resolve({ error: null })
    })
    mockFrom.mockReturnValue({ insert: mockInsertFn })

    const { createArtikel } = await import('../actions')
    const fd = makeFormData({
      kategorie: 'sterbegeld',
      thema: 'Gültiges Thema',
      inhalt: 'Ein ausreichend langer Inhalt für Sterbegeld Versicherungen.',
      tags: ' grundlagen , senioren , sofortschutz ',
    })

    const result = await createArtikel(fd)
    expect(result.success).toBe(true)

    // Verify tags were trimmed and split correctly
    expect(capturedInsertData).not.toBeNull()
    const data = capturedInsertData as Record<string, unknown>
    expect(data.tags).toEqual(['grundlagen', 'senioren', 'sofortschutz'])
  })

  it('filters empty strings from tags parsing', async () => {
    let capturedInsertData: unknown = null
    const mockInsertFn = vi.fn().mockImplementation((data: unknown) => {
      capturedInsertData = data
      return Promise.resolve({ error: null })
    })
    mockFrom.mockReturnValue({ insert: mockInsertFn })

    const { createArtikel } = await import('../actions')
    const fd = makeFormData({
      kategorie: 'allgemein',
      thema: 'Thema ohne Tags',
      inhalt: 'Ein ausreichend langer Inhalt für den Filtertest der Tags.',
      tags: '',
    })

    const result = await createArtikel(fd)
    expect(result.success).toBe(true)
    const data = capturedInsertData as Record<string, unknown>
    expect(data.tags).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// AI read-path: context block contains correct thema for specific kategorie
// ---------------------------------------------------------------------------

describe('fetchWissensfundusKontext — context content', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@a.de' } } })
  })

  it('context block includes both product-specific and allgemein thema entries', async () => {
    const mockInFn = vi.fn().mockImplementation((_column: string, values: string[]) => {
      // Verify the query includes both the produktTyp and 'allgemein'
      expect(values).toContain('sterbegeld')
      expect(values).toContain('allgemein')
      return Promise.resolve({
        data: [
          { thema: 'Sterbegeld Basics', inhalt: 'Sterbegeld deckt Bestattungskosten.' },
          { thema: 'Allgemeine Versicherungspflicht', inhalt: 'In Deutschland gilt Versicherungspflicht.' },
        ],
        error: null,
      })
    })
    const mockSelectFn = vi.fn().mockReturnValue({ in: mockInFn })
    mockFrom.mockReturnValue({ select: mockSelectFn })

    const { fetchWissensfundusKontext } = await import('@/lib/anthropic/generator')
    const result = await fetchWissensfundusKontext('sterbegeld')

    expect(result).toContain('### Sterbegeld Basics')
    expect(result).toContain('### Allgemeine Versicherungspflicht')
    expect(result).toContain('Sterbegeld deckt Bestattungskosten.')
  })

  it('selects only thema and inhalt columns (not id or tags)', async () => {
    let capturedSelectArg: string | null = null
    const mockSelectFn = vi.fn().mockImplementation((columns: string) => {
      capturedSelectArg = columns
      return {
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })
    mockFrom.mockReturnValue({ select: mockSelectFn })

    const { fetchWissensfundusKontext } = await import('@/lib/anthropic/generator')
    await fetchWissensfundusKontext('leben')

    // Verify only lean columns are selected
    expect(capturedSelectArg).toBe('thema, inhalt')
  })
})

// ---------------------------------------------------------------------------
// DB error handling: createArtikel surface error from Supabase
// ---------------------------------------------------------------------------

describe('createArtikel — Supabase DB error', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@a.de' } } })
  })

  it('returns DB error message when insert fails', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: { message: 'unique constraint violated' } }),
    })

    const { createArtikel } = await import('../actions')
    const fd = makeFormData({
      kategorie: 'unfall',
      thema: 'Unfallversicherung',
      inhalt: 'Die Unfallversicherung schützt bei körperlichen Schäden durch Unfälle.',
      tags: '',
    })

    const result = await createArtikel(fd)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Datenbankfehler beim Erstellen')
  })
})
