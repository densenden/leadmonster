import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { untyped } from '@/lib/supabase/untyped'
import { ProduktTypForm } from '../_components/ProduktTypForm'
import { archiveProduktTyp } from '@/app/admin/produkt-typen/actions'
import type { ProduktTypInput } from '@/lib/validation/produkt-typen'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { slug: string }
}

export default async function VersicherungsartBearbeitenPage({ params }: PageProps) {
  const supabase = createAdminClient()
  const sb = untyped(supabase)
  const { data: row, error } = await sb
    .from('produkt_typen')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle()

  if (error || !row) {
    notFound()
  }

  // Counts: wie viele Produkte hängen daran?
  const { count: produkteCount } = await supabase
    .from('produkte')
    .select('*', { count: 'exact', head: true })
    .eq('typ', params.slug)

  const initialData: Partial<ProduktTypInput> & { slug: string } = {
    slug: row.slug as string,
    name: row.name as string,
    summen: Array.isArray(row.summen) ? (row.summen as number[]) : [],
    default_summe: row.default_summe as number,
    default_age: row.default_age as number,
    min_age: row.min_age as number,
    max_age: row.max_age as number,
    summe_label: row.summe_label as string,
    beitrag_label: row.beitrag_label as string,
    summe_suffix: row.summe_suffix as string,
    einheit: row.einheit as 'eur_summe' | 'eur_monat',
    filter_axes: Array.isArray(row.filter_axes) ? (row.filter_axes as ProduktTypInput['filter_axes']) : [],
    image_brand_look: (row.image_brand_look as ProduktTypInput['image_brand_look']) ?? null,
    image_typ_scenes: (row.image_typ_scenes as string[] | null) ?? null,
    wissensfundus_label: row.wissensfundus_label as string,
    active: row.active as boolean,
  }

  async function handleArchive() {
    'use server'
    await archiveProduktTyp(params.slug)
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <nav className="mb-6 text-sm text-[#999]">
        <Link href="/admin/produkt-typen" className="hover:text-[#1a365d] hover:underline">
          Versicherungsarten
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#333]">{row.name as string}</span>
      </nav>

      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#333]">
            {row.name as string}
          </h1>
          <p className="mt-1 text-sm text-[#666]">
            <span className="font-mono">{row.slug as string}</span> ·{' '}
            {produkteCount ?? 0} Produkte verlinkt
          </p>
        </div>
        {row.active && (produkteCount ?? 0) === 0 && (
          <form action={handleArchive}>
            <button
              type="submit"
              className="border border-gray-300 px-4 py-2 text-sm text-[#666] hover:bg-gray-50"
            >
              Archivieren
            </button>
          </form>
        )}
      </div>

      <ProduktTypForm mode="edit" initialData={initialData} />
    </div>
  )
}
