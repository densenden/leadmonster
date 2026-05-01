// Footer-Strip "Mitglied im BVK · IHK München · ERGO-Berufshaftpflicht".
// Schema.org/Organization für gesammelte Trust-Marker.
import { loadTrust } from '@/lib/trust/load'
import { loadEinstellung } from '@/lib/einstellungen/load'

export async function TrustFooterStrip() {
  const verbaende = await loadTrust({ typen: ['verband'], limit: 6 })
  const ihk = await loadEinstellung('firma_aufsicht')
  const haftpflicht = await loadEinstellung('firma_berufshaftpflicht')

  const items: { label: string; href?: string | null }[] = []
  for (const v of verbaende) {
    items.push({ label: v.titel, href: v.quelle_url ?? null })
  }
  if (ihk) items.push({ label: 'Aufsicht: IHK München' })
  if (haftpflicht) items.push({ label: 'ERGO-Berufshaftpflicht' })

  if (items.length === 0) return null

  return (
    <div className="bg-white/5 border-t border-white/10 py-4 mt-8">
      <ul role="list" className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/60">
        {items.map((it, i) => (
          <li key={i}>
            {it.href ? (
              <a href={it.href} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                {it.label} ↗
              </a>
            ) : it.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
