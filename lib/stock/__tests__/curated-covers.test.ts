import { describe, it, expect } from 'vitest'
import { CURATED_COVERS, getCuratedCoverForSlug } from '../curated-covers'

describe('CURATED_COVERS CDN URLs', () => {
  it('every curated cover returns HTTP 200', async () => {
    const failures: string[] = []
    for (const slug of Object.keys(CURATED_COVERS)) {
      const cover = getCuratedCoverForSlug(slug)
      if (!cover) {
        failures.push(`${slug}: missing`)
        continue
      }
      const res = await fetch(cover.cover_image_url, { method: 'HEAD' })
      if (!res.ok) failures.push(`${slug}: ${res.status} ${cover.cover_image_url}`)
    }
    expect(failures, failures.join('\n')).toEqual([])
  }, 60_000)
})
