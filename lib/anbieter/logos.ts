import { slugifyAnbieter } from './slug'

/** Static logo paths keyed by slugified anbieter_name. */
const ANBIETER_LOGO_PATHS: Record<string, string> = {
  allianz: '/images/anbieter/allianz.png',
  dela: '/images/anbieter/dela.png',
  ideal: '/images/anbieter/ideal.png',
  lv1871: '/images/anbieter/lv1871.png',
  hannoversche: '/images/anbieter/hannoversche.png',
  hannoverische: '/images/anbieter/hannoversche.png',
}

export function getAnbieterLogoSrc(anbieterName: string): string | null {
  const slug = slugifyAnbieter(anbieterName)
  return ANBIETER_LOGO_PATHS[slug] ?? null
}
