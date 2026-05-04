import { createAdminClient } from '@/lib/supabase/server'
import { resolveAccentColor } from '@/lib/utils/accent'
import { ProduktChrome } from '@/app/_components/ProduktChrome'

export default async function ProduktLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { produkt: string }
}) {
  let produktName = params.produkt
  let accentColor = '#02a9e6'
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('produkte')
      .select('name, typ, accent_color')
      .eq('slug', params.produkt)
      .maybeSingle()
    if (data) {
      produktName = data.name
      accentColor = resolveAccentColor(data.typ, data.accent_color)
    }
  } catch {
    // Keep defaults
  }

  return (
    <ProduktChrome slug={params.produkt} name={produktName} accentColor={accentColor}>
      {children}
    </ProduktChrome>
  )
}
