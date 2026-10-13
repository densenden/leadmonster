import { describe, it, expect } from 'vitest'
import {
  formatGermanBirthdateInput,
  formatPublicationStatusLabel,
  parseGermanBirthdateToIso,
} from '@/lib/utils/date'

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

describe('German birthdate helpers', () => {
  it('formats digits into TT.MM.JJJJ while typing', () => {
    expect(formatGermanBirthdateInput('1')).toBe('1')
    expect(formatGermanBirthdateInput('15')).toBe('15')
    expect(formatGermanBirthdateInput('150')).toBe('15.0')
    expect(formatGermanBirthdateInput('1505')).toBe('15.05')
    expect(formatGermanBirthdateInput('15051960')).toBe('15.05.1960')
    expect(formatGermanBirthdateInput('15.05.1960')).toBe('15.05.1960')
  })

  it('parses a valid German birthdate to ISO', () => {
    expect(parseGermanBirthdateToIso('15.05.1960')).toBe('1960-05-15')
  })

  it('rejects incomplete or impossible dates', () => {
    expect(parseGermanBirthdateToIso('15.05.60')).toBeNull()
    expect(parseGermanBirthdateToIso('31.02.1960')).toBeNull()
    expect(parseGermanBirthdateToIso('1960-05-15')).toBeNull()
  })
})
