import { createAdminClient } from '@/lib/supabase/server'
import { resolveAccentColor } from '@/lib/utils/accent'
import { ProduktChrome } from '@/app/_components/ProduktChrome'
import { TrustStoryLine } from '@/components/sections/TrustStoryLine'

export default async function ProduktLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { produkt: string }
}) {
  let produktName = params.produkt
  let accentColor = '#02a9e6'
  let produktTyp = 'sterbegeld'
  let brandSubline: string | null = null
  let navbarLogoVisible = false
  let navbarLogoUrl: string | null = null
  let navbarLogoAlt: string | null = null
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('produkte')
      .select('name, typ, accent_color, brand_display_name, brand_subline, navbar_logo_visible, navbar_logo_url, navbar_logo_alt')
      .eq('slug', params.produkt)
      .maybeSingle()
    if (data) {
      // Display-Name: brand_display_name übersteuert den Produktnamen.
      produktName = data.brand_display_name ?? data.name
      accentColor = resolveAccentColor(data.typ, data.accent_color)
      produktTyp = data.typ
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
      slug={params.produkt}
      name={produktName}
      accentColor={accentColor}
      brandSubline={brandSubline}
      navbarLogoVisible={navbarLogoVisible}
      navbarLogoUrl={navbarLogoUrl}
      navbarLogoAlt={navbarLogoAlt}
    >
      {produktTyp !== 'sterbegeld' && <TrustStoryLine />}
      {children}
    </ProduktChrome>
  )
}
