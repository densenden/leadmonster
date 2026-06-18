'use client'

/** Shows when a product has an active style reference — used on image generation UIs. */
interface StyleReferenceActiveBannerProps {
  styleDescription?: string | null
  styleReferenceUrl?: string | null
  /** Tighter layout for section image panel. */
  compact?: boolean
}

export function StyleReferenceActiveBanner({
  styleDescription,
  styleReferenceUrl,
  compact = false,
}: StyleReferenceActiveBannerProps) {
  const desc = styleDescription?.trim() ?? ''
  if (!desc && !styleReferenceUrl) return null

  return (
    <div
      className={`flex gap-3 border border-[#abd5f4] bg-[#e1f0fb] ${
        compact ? 'p-2' : 'p-3'
      }`}
      data-testid="style-reference-active-banner"
    >
      {styleReferenceUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={styleReferenceUrl}
          alt=""
          className={`shrink-0 object-cover border border-[#abd5f4] ${
            compact ? 'h-12 w-16' : 'h-16 w-24'
          }`}
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p
          className={`font-medium text-[#1a3252] ${compact ? 'text-[11px]' : 'text-xs'}`}
        >
          Stilreferenz aktiv — wird in den Bild-Prompt eingebaut
        </p>
        {desc ? (
          <p
            className={`mt-0.5 italic text-[#333333] leading-snug ${
              compact ? 'text-[10px] line-clamp-2' : 'text-xs'
            }`}
          >
            {desc}
          </p>
        ) : (
          <p className="mt-0.5 text-[10px] text-[#666666]">
            Referenzbild hochgeladen; Stil-Text fehlt noch (Vision-Analyse erneut auslösen).
          </p>
        )}
      </div>
    </div>
  )
}
