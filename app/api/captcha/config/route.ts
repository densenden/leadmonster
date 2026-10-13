/**
 * GET /api/captcha/config
 * Public: returns { enabled, provider, siteKey } — never the secret.
 * LeadForm uses this so admin can switch provider / keys without redeploy.
 * Also sets a signed HttpOnly form-open cookie for server-side dwell checks.
 */
import { getCaptchaPublicConfig } from '@/lib/captcha/config'
import {
  createFormSessionToken,
  formSessionSetCookieHeader,
} from '@/lib/captcha/form-session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const config = await getCaptchaPublicConfig()
  const formSession = createFormSessionToken()

  return Response.json(
    {
      enabled: config.enabled,
      provider: config.provider,
      siteKey: config.siteKey,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Set-Cookie': formSessionSetCookieHeader(formSession),
      },
    },
  )
}
