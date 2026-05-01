/**
 * Vision-Style-Analyser — extrahiert eine englische Stil-Direktive aus einem
 * hochgeladenen Referenzbild. Wird einmalig beim Style-Reference-Upload
 * aufgerufen; das Ergebnis landet in `produkte.style_description` und wird
 * von buildHeroPrompt() / buildSectionPrompt() automatisch an jeden Bild-
 * Prompt angehängt.
 *
 * Warum nicht direkt das Bild als Reference an gpt-image-1 reichen?
 *   gpt-image-1 unterstützt nur images.edit() mit Mask, kein Style-Transfer.
 *   Vision-Modelle (GPT-4o, GPT-5) können dafür Bilder ANALYSIEREN und uns
 *   eine textuelle Stil-Beschreibung liefern, die wir dann in Generations-
 *   Prompts einspeisen. Das ist robust gegen API-Änderungen und liefert
 *   gleichbleibend kohärenten Look über alle Bilder eines Produkts.
 */

const VISION_MODEL = process.env.OPENAI_VISION_MODEL ?? 'gpt-4o-mini'

const VISION_SYSTEM_PROMPT = `You are a professional art director. Given a single image, describe its
VISUAL STYLE in 1–2 concise English sentences. Focus only on:
  - color palette (e.g. "warm earth tones with sage accents")
  - rendering technique (e.g. "soft watercolor illustration", "documentary photography", "muted film grain")
  - lighting & mood (e.g. "diffuse afternoon light, contemplative atmosphere")
  - composition style (e.g. "tight crops on objects, shallow depth of field")

Do NOT describe the subject, the people or the location. Do NOT speculate
about the brand. Do NOT exceed 2 sentences. Output PLAIN ENGLISH only,
no markdown, no quotes, no list bullets — a single paragraph the image
generator can append after "Visual style direction: ...".`

export interface VisionStyleResult {
  description: string
  model: string
}

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: string } }>
}

/**
 * Schickt die übergebene Bild-URL an GPT-Vision und bekommt eine
 * englische Stil-Beschreibung zurück. Wirft bei Fehlern.
 */
export async function describeImageStyle(imageUrl: string): Promise<VisionStyleResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY fehlt')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      max_tokens: 180,
      temperature: 0.3,
      messages: [
        { role: 'system', content: VISION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe the visual style of this image.' },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`OpenAI Vision ${res.status}: ${txt.slice(0, 500)}`)
  }

  const json = (await res.json()) as OpenAiChatResponse
  const content = json.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Vision-Antwort enthält keine Beschreibung')

  // Defensive sanitisation: einzeilig + Trim auf ca. 400 Zeichen.
  const cleaned = content.replace(/\s+/g, ' ').slice(0, 400).trim()
  return { description: cleaned, model: VISION_MODEL }
}
