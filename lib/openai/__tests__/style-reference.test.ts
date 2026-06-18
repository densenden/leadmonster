import { describe, it, expect } from 'vitest'
import {
  mergeStyleDescriptionIntoPrompt,
  promptIncludesStyleReference,
} from '../style-reference'

describe('promptIncludesStyleReference', () => {
  it('erkennt Hero STYLE-FIRST Marker', () => {
    expect(
      promptIncludesStyleReference('VISUAL STYLE (primary direction): soft watercolor.'),
    ).toBe(true)
  })

  it('erkennt angehängte Visual style direction', () => {
    expect(
      promptIncludesStyleReference('Scene. Visual style direction: muted tones.'),
    ).toBe(true)
  })

  it('ist false ohne Stil-Marker', () => {
    expect(promptIncludesStyleReference('Editorial photo of a garden.')).toBe(false)
  })
})

describe('mergeStyleDescriptionIntoPrompt', () => {
  it('hängt style_description an, wenn noch nicht im Prompt', () => {
    const { prompt, styleReferenceApplied } = mergeStyleDescriptionIntoPrompt(
      'A calm desk scene.',
      'watercolor, warm earth tones',
    )
    expect(styleReferenceApplied).toBe(true)
    expect(prompt).toContain('Visual style direction: watercolor, warm earth tones')
  })

  it('vermeidet Doppel-Anhängen bei bestehendem VISUAL STYLE', () => {
    const base =
      'VISUAL STYLE (primary direction): already here. SUBJECT: garden.'
    const { prompt, styleReferenceApplied } = mergeStyleDescriptionIntoPrompt(
      base,
      'should not duplicate',
    )
    expect(styleReferenceApplied).toBe(true)
    expect(prompt).toBe(base)
    expect(prompt).not.toContain('should not duplicate')
  })

  it('macht nichts ohne style_description', () => {
    const { prompt, styleReferenceApplied } = mergeStyleDescriptionIntoPrompt(
      'Plain prompt.',
      null,
    )
    expect(styleReferenceApplied).toBe(false)
    expect(prompt).toBe('Plain prompt.')
  })
})
