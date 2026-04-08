// Pure reading-time estimator for Ratgeber article sections.
// Concatenates all text content across all section variants,
// counts words, divides by average adult reading speed (200 wpm),
// and clamps the result to a minimum of 2 minutes.
import type { RatgeberSection } from '@/lib/types/ratgeber'

// Average adult reading speed in words per minute.
const WORDS_PER_MINUTE = 200

// Minimum displayed reading time in minutes.
const MINIMUM_MINUTES = 2

/**
 * Calculate the estimated reading time in minutes for an array of sections.
 *
 * Text is extracted from all section types:
 * - intro: text field
 * - body: heading + all paragraphs
 * - steps: heading + each item's title + description
 * - cta: headline + cta_text
 * - related: each article's title
 *
 * Returns a whole-number estimate, never below MINIMUM_MINUTES.
 */
export function calculateReadingTime(sections: RatgeberSection[]): number {
  const textParts: string[] = []

  for (const section of sections) {
    switch (section.type) {
      case 'intro':
        textParts.push(section.text)
        break

      case 'body':
        textParts.push(section.heading)
        textParts.push(...section.paragraphs)
        break

      case 'steps':
        textParts.push(section.heading)
        for (const item of section.items) {
          textParts.push(item.title)
          textParts.push(item.description)
        }
        break

      case 'cta':
        textParts.push(section.headline)
        textParts.push(section.cta_text)
        break

      case 'related':
        for (const article of section.articles) {
          textParts.push(article.title)
        }
        break

      default:
        // TypeScript exhaustiveness guard — no crash for unknown future variants.
        break
    }
  }

  const allText = textParts.join(' ')
  const wordCount = allText.split(/\s+/).filter(word => word.length > 0).length
  const rawMinutes = Math.ceil(wordCount / WORDS_PER_MINUTE)

  return Math.max(rawMinutes, MINIMUM_MINUTES)
}
