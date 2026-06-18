import { ProduktChrome } from '@/app/_components/ProduktChrome'
import { createAdminClient } from '@/lib/supabase/server'
import { ROOT_PRODUKT_SLUG } from '@/lib/seo/organization'
import { resolveAccentColor } from '@/lib/utils/accent'

// Same header/footer as homepage and product pages (root brand).
export default async function BlogLayout({ children }: { children: React.ReactNode }) {
  let produktName = 'Sterbegeld24Plus'
  let accentColor = '#02a9e6'
  let brandSubline: string | null = null
  let navbarLogoVisible = false
  let navbarLogoUrl: string | null = null
  let navbarLogoAlt: string | null = null
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('produkte')
      .select('name, typ, accent_color, brand_display_name, brand_subline, navbar_logo_visible, navbar_logo_url, navbar_logo_alt')
      .eq('slug', ROOT_PRODUKT_SLUG)
      .maybeSingle()
    if (data) {
      produktName = data.brand_display_name ?? data.name
      accentColor = resolveAccentColor(data.typ, data.accent_color)
      brandSubline = data.brand_subline
      navbarLogoVisible = Boolean(data.navbar_logo_visible)
      navbarLogoUrl = data.navbar_logo_url
      navbarLogoAlt = data.navbar_logo_alt
    }
  } catch {
    // Keep defaults
  }

  return (
    <ProduktChrome
      slug={ROOT_PRODUKT_SLUG}
      name={produktName}
      accentColor={accentColor}
      brandSubline={brandSubline}
      navbarLogoVisible={navbarLogoVisible}
      navbarLogoUrl={navbarLogoUrl}
      navbarLogoAlt={navbarLogoAlt}
      homePath="/"
      legalPathPrefix=""
    >
      {children}
    </ProduktChrome>
  )
}
