/**
 * GET /api/turnstile/config
 * Legacy endpoint — forwards to unified captcha config shape
 * so old clients still work. Prefer /api/captcha/config.
 */
import { getCaptchaPublicConfig } from '@/lib/captcha/config'

export const dynamic = 'force-dynamic'

export async function GET() {
  const config = await getCaptchaPublicConfig()
  return Response.json(
    {
      enabled: config.enabled,
      provider: config.provider,
      siteKey: config.siteKey,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
