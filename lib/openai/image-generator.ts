/**
 * OpenAI Image Generator (gpt-image-1)
 *
 * Generiert Bilder für Produktseiten und Blog-Artikel, lädt sie in
 * Supabase Storage (Bucket "produkt-bilder") und legt eine Reihe
 * in der `bilder`-Tabelle an. Liefert die öffentliche URL zurück.
 *
 * Verwendung:
 *   const { url, alt } = await generateImage({
 *     prompt: 'Senior couple smiling on a park bench, warm light',
 *     slot: 'hero',
 *     produktId: '...',
 *     altText: 'Senior auf einer Parkbank — Hauptbild Sterbegeld',
 *   })
 *
 * Sicherheitsnetz: bei Fehlern (Quota, Timeout, Provider down) wirft die
 * Funktion einen typed Error — Aufrufer entscheidet, ob Fallback (Stock-Bild
 * oder leeres Hero) verwendet wird.
 */
import { createAdminClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImageSlot = 'hero' | 'feature' | 'inline' | 'og' | 'blog_cover'

export interface GenerateImageInput {
  prompt: string
  slot: ImageSlot
  altText: string
  produktId?: string
  blogPostId?: string
  pageType?: string
  /** Wenn true, wird das Bild nur generiert + zurückgegeben, kein DB-Insert. */
  dryRun?: boolean
}

export interface GenerateImageOutput {
  url: string
  alt: string
  width: number
  height: number
  bilderRowId?: string
}

// ---------------------------------------------------------------------------
// Slot → Größe Mapping
// ---------------------------------------------------------------------------

// gpt-image-1 (April 2026) accepts only: 1024x1024 | 1024x1536 | 1536x1024 | auto
// (DALL-E 3's 1792x1024 is not supported). 1536x1024 is the closest landscape.
const SLOT_SIZES: Record<ImageSlot, { size: string; w: number; h: number }> = {
  hero:       { size: '1536x1024', w: 1536, h: 1024 },
  blog_cover: { size: '1536x1024', w: 1536, h: 1024 },
  og:         { size: '1536x1024', w: 1200, h: 630 },  // OG-Crop-Target bleibt 1200x630
  feature:    { size: '1024x1024', w: 1024, h: 1024 },
  inline:     { size: '1024x1024', w: 1024, h: 1024 },
}

// Stil-Guard wird an jeden Prompt angehängt — sorgt für konsistenten,
// professionellen Look ohne Texteinblendungen oder problematische Inhalte.
const STYLE_GUARD =
  ' Photorealistic, professional German insurance brand photography, soft natural lighting, ' +
  'calm composition, no text overlays, no watermarks, no faces of identifiable real people, ' +
  'aspect appropriate to layout, premium feel, neutral warm color palette.'

// ---------------------------------------------------------------------------
// OpenAI HTTP-Aufruf (kein SDK — minimaler Footprint)
// ---------------------------------------------------------------------------

interface OpenAiImageResponse {
  data: Array<{
    b64_json?: string
    url?: string
  }>
}

async function callOpenAi(prompt: string, size: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY fehlt')

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size,
      n: 1,
      // gpt-image-1 returns base64 by default
    }),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`OpenAI Images API ${res.status}: ${txt.slice(0, 500)}`)
  }

  const json = (await res.json()) as OpenAiImageResponse
  const b64 = json.data?.[0]?.b64_json
  if (!b64) throw new Error('OpenAI Antwort enthält keine Bilddaten')
  return b64
}

// ---------------------------------------------------------------------------
// Storage-Upload
// ---------------------------------------------------------------------------

const BUCKET = 'produkt-bilder'

async function uploadToStorage(
  base64: string,
  fileName: string,
): Promise<string> {
  const supabase = createAdminClient()
  const buffer = Buffer.from(base64, 'base64')

  // Bucket existiert ggf. nicht — beim ersten Upload erstellen
  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.find(b => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: true })
  }

  const path = `${new Date().getFullYear()}/${fileName}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: 'image/png',
      upsert: true,
    })
  if (error) throw new Error(`Storage-Upload fehlgeschlagen: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// ---------------------------------------------------------------------------
// Hauptfunktion
// ---------------------------------------------------------------------------

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  const sizeConfig = SLOT_SIZES[input.slot]
  const fullPrompt = `${input.prompt.trim()}${STYLE_GUARD}`

  const base64 = await callOpenAi(fullPrompt, sizeConfig.size)

  // Eindeutiger Filename
  const safe = input.altText.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)
  const fileName = `${input.slot}-${safe}-${Date.now()}.png`

  const url = await uploadToStorage(base64, fileName)

  if (input.dryRun) {
    return { url, alt: input.altText, width: sizeConfig.w, height: sizeConfig.h }
  }

  // bilder-Row anlegen
  const supabase = createAdminClient()
  const { data: row, error: insertError } = await supabase
    .from('bilder')
    .insert({
      produkt_id: input.produktId ?? null,
      blog_post_id: input.blogPostId ?? null,
      page_type: input.pageType ?? null,
      slot: input.slot,
      url,
      alt_text: input.altText,
      prompt_used: fullPrompt,
      provider: 'openai',
      width: sizeConfig.w,
      height: sizeConfig.h,
    })
    .select('id')
    .single()

  if (insertError) {
    // Bild ist bereits in Storage abgelegt — DB-Row fehlt aber. Sichtbar in der
    // Bilder-Bibliothek wird es erst, wenn die Row existiert. Hochwerfen, damit
    // der Aufrufer den Fehler sieht und nicht stillschweigend "alles ok" meldet.
    throw new Error(`bilder-Insert fehlgeschlagen: ${insertError.message}`)
  }

  return {
    url,
    alt: input.altText,
    width: sizeConfig.w,
    height: sizeConfig.h,
    bilderRowId: row?.id,
  }
}

// Re-export for back-compat with callers that imported from this module.
export { defaultHeroPrompt } from './hero-prompt'
