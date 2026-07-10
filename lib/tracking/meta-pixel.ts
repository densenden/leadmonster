// Meta (Facebook) Pixel — loads only after marketing cookie consent (TTDSG / DSGVO).

declare global {
  interface Window {
    fbq?: FbqFunction
    _fbq?: FbqFunction
  }
}

type FbqFunction = {
  (...args: unknown[]): void
  callMethod?: (...args: unknown[]) => void
  queue: unknown[]
  push: FbqFunction
  loaded: boolean
  version: string
}

/** Default pixel for Sterbegeld24Plus / finanzteam26 campaigns. Override via env. */
export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || '374844728246470'

let pixelInitialized = false

export function isMetaPixelConfigured(): boolean {
  return META_PIXEL_ID.length > 0
}

function bootstrapFbq(): FbqFunction {
  if (window.fbq) return window.fbq

  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) {
      fbq.callMethod(...args)
    } else {
      fbq.queue.push(args)
    }
  } as FbqFunction

  if (!window._fbq) window._fbq = fbq
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.queue = []
  window.fbq = fbq

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)

  return fbq
}

/** Idempotent — safe to call on every route change when marketing consent is granted. */
export function initMetaPixel(): void {
  if (typeof window === 'undefined' || !isMetaPixelConfigured()) return

  const fbq = bootstrapFbq()
  if (!pixelInitialized) {
    fbq('init', META_PIXEL_ID)
    pixelInitialized = true
  }
  fbq('track', 'PageView')
}

export function trackMetaPageView(): void {
  if (typeof window === 'undefined' || !pixelInitialized || !window.fbq) return
  window.fbq('track', 'PageView')
}

/** Standard conversion event after successful lead form submit. */
export interface MetaLeadEventParams {
  contentName?: string
  value?: number
  currency?: string
}

export function trackMetaLead(params?: MetaLeadEventParams | string): void {
  if (typeof window === 'undefined' || !pixelInitialized || !window.fbq) return
  const resolved =
    typeof params === 'string' ? { contentName: params } : (params ?? {})
  const payload: Record<string, string | number> = {}
  if (resolved.contentName) payload.content_name = resolved.contentName
  if (resolved.value != null && !Number.isNaN(resolved.value)) {
    payload.value = resolved.value
    payload.currency = resolved.currency ?? 'EUR'
  }
  window.fbq('track', 'Lead', payload)
}

/** Fired when user views a calculator / comparison result (mid-funnel). */
export function trackMetaViewContent(params: {
  contentName: string
  contentCategory?: string
}): void {
  if (typeof window === 'undefined' || !pixelInitialized || !window.fbq) return
  const payload: Record<string, string> = { content_name: params.contentName }
  if (params.contentCategory) payload.content_category = params.contentCategory
  window.fbq('track', 'ViewContent', payload)
}

/** Reset helper for unit tests. */
export function resetMetaPixelForTests(): void {
  pixelInitialized = false
}
