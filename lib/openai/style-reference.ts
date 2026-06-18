/**
 * Shared helpers for product style-reference (Stilreferenz) in image prompts.
 * Style is stored as produkte.style_description (from Vision on style_reference_url).
 */

/** True when the prompt already embeds the product style (hero or section builders). */
export function promptIncludesStyleReference(prompt: string): boolean {
  const lower = prompt.toLowerCase()
  return (
    lower.includes('visual style direction') ||
    lower.includes('visual style (primary direction') ||
    lower.includes('visuel style direction') // typo guard
  )
}

export interface MergeStyleResult {
  prompt: string
  /** Whether style_description was merged into this prompt (not skipped as duplicate). */
  styleReferenceApplied: boolean
}

/**
 * Appends style_description when set and not already present in the prompt.
 * Used by admin image APIs so manual prompts still get the product look.
 */
export function mergeStyleDescriptionIntoPrompt(
  prompt: string,
  styleDescription: string | null | undefined,
): MergeStyleResult {
  const trimmed = styleDescription?.trim() ?? ''
  if (!trimmed) {
    return { prompt, styleReferenceApplied: false }
  }
  if (promptIncludesStyleReference(prompt)) {
    return { prompt, styleReferenceApplied: true }
  }
  return {
    prompt: `${prompt.trim()} Visual style direction: ${trimmed}.`,
    styleReferenceApplied: true,
  }
}
