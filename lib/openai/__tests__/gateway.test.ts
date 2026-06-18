import { describe, expect, it } from 'vitest'
import { buildOpenAiRoute } from '../gateway'

describe('buildOpenAiRoute', () => {
  it('prefers gateway key over openai key', () => {
    const route = buildOpenAiRoute({
      gatewayKey: 'gw-secret-key-12345',
      openaiKey: 'sk-openai-key-12345678',
    })
    expect(route.viaGateway).toBe(true)
    expect(route.prefixModel('gpt-image-1')).toBe('openai/gpt-image-1')
  })

  it('uses direct openai when no gateway', () => {
    const route = buildOpenAiRoute({ openaiKey: 'sk-openai-key-12345678' })
    expect(route.viaGateway).toBe(false)
    expect(route.imagesUrl).toContain('api.openai.com')
  })

  it('rejects empty env-style placeholders', () => {
    expect(() => buildOpenAiRoute({ openaiKey: '' })).toThrow()
    expect(() => buildOpenAiRoute({ openaiKey: 'short' })).toThrow()
  })
})
