/**
 * Shared portrait framing for circular author avatars.
 *
 * Upload pipeline (`toSquareWebp`) uses PORTRAIT_CROP_TOP_BIAS when cropping
 * portrait photos to square — lower value = more headroom = face sits lower
 * in the circle.
 *
 * Display uses a clipped wrapper + slightly oversized image so CSS can nudge the
 * face down inside the circle (object-position alone cannot fix square sources).
 */

/** Fraction of vertical slack used as extract `top` for portrait (height > width) sources. */
export const PORTRAIT_CROP_TOP_BIAS = 0.22 as const

export const PORTRAIT_CIRCLE_WRAPPER =
  'overflow-hidden rounded-full shrink-0' as const

/** Apply on the inner <img> inside PORTRAIT_CIRCLE_WRAPPER. */
export const PORTRAIT_CIRCLE_INNER =
  'block w-full h-[132%] max-w-none object-cover object-[center_42%] -translate-y-[16%]' as const

/** @deprecated Use PortraitCircle or PORTRAIT_CIRCLE_WRAPPER + PORTRAIT_CIRCLE_INNER */
export const PORTRAIT_CIRCLE_IMG =
  `${PORTRAIT_CIRCLE_WRAPPER} ${PORTRAIT_CIRCLE_INNER}` as const
