import { describe, expect, it } from 'vitest'
import {
  buildHeroJob,
  collectHauptseiteJobs,
  collectRatgeberJobs,
  type ProduktPromptContext,
} from '../regenerate-product-images'

const ctx: ProduktPromptContext = {
  id: 'p1',
  name: 'Sterbegeld24Plus',
  slug: 'sterbegeld24plus',
  typ: 'sterbegeld',
  styleDescription: null,
  zielgruppe: ['senioren_50plus'],
  fokus: 'sicherheit',
  anbieter: null,
  argumente: null,
}

describe('regenerate-product-images job collection', () => {
  it('always includes hero job', () => {
    const job = buildHeroJob(ctx)
    expect(job.slot).toBe('hero')
    expect(job.prompt.length).toBeGreaterThan(50)
  })

  it('collects image_text_split sections on hauptseite', () => {
    const jobs = collectHauptseiteJobs(ctx, [
      { type: 'hero' },
      { type: 'image_text_split', headline: 'Warum vorsorgen', body: 'Text' },
    ])
    expect(jobs).toHaveLength(1)
    expect(jobs[0].slot).toBe('inline')
  })

  it('collects cover + image_text per ratgeber', () => {
    const jobs = collectRatgeberJobs(
      ctx,
      'was-ist-sterbegeld',
      'Was ist Sterbegeld',
      'Meta',
      [
        { type: 'intro', text: 'Intro' },
        { type: 'image_text', heading: 'Warum' },
      ],
    )
    expect(jobs.some(j => j.key.endsWith('-cover'))).toBe(true)
    expect(jobs.filter(j => j.key.includes('section')).length).toBe(1)
  })
})
