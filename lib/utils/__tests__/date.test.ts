import { describe, it, expect } from 'vitest'
import { formatPublicationStatusLabel } from '@/lib/utils/date'

describe('formatPublicationStatusLabel', () => {
  it('treats publiziert as published even without published_at', () => {
    expect(formatPublicationStatusLabel('publiziert', null)).toBe(
      'Veröffentlicht (Datum fehlt)',
    )
  })

  it('shows review state as not yet published', () => {
    expect(formatPublicationStatusLabel('review', null)).toBe(
      'In Review — noch nicht veröffentlicht',
    )
  })

  it('shows entwurf as not yet published even when published_at is set', () => {
    expect(formatPublicationStatusLabel('entwurf', '2026-04-07T10:00:00.000Z')).toBe(
      'Noch nicht veröffentlicht',
    )
  })
})
