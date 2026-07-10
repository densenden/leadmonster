import { describe, it, expect } from 'vitest'
import { buildMetaLeadEventPreview, getMetaPixelAdminConfig } from '../pixel-config'

describe('pixel-config', () => {
  it('exposes pixel id and three standard events', () => {
    const config = getMetaPixelAdminConfig()
    expect(config.pixelId).toBeTruthy()
    expect(config.events.map(e => e.name)).toEqual(['PageView', 'ViewContent', 'Lead'])
  })

  it('builds Lead preview with value when monatsbeitrag is set', () => {
    const preview = buildMetaLeadEventPreview({
      intent_tag: 'preis',
      zielgruppe_tag: 'senioren',
      monatsbeitrag_eur: 19.8,
    })
    expect(preview.event).toBe('Lead')
    expect(preview.parameters.content_name).toBe('preis')
    expect(preview.parameters.value).toBe(19.8)
    expect(preview.parameters.currency).toBe('EUR')
  })
})
