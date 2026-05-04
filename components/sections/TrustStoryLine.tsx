// Wiederkehrende Trust-Story-H2 für Nicht-Sterbegeld-Subpfade unter
// sterbegeld24plus.de — macht aus dem scheinbaren Branding-Konflikt eine
// kohärente Story (siehe § 8 Mitigation 3).
//
// Wird in app/[produkt]/layout.tsx und app/page.tsx eingeblendet, wenn
// produkt.typ !== 'sterbegeld'. Auf der Sterbegeld-Hauptseite ist das
// Branding selbsterklärend, daher dort weglassen.
import Link from 'next/link'

export function TrustStoryLine() {
  return (
    <aside className="bg-[#f5f9ff] border-b border-[#e2e8f0]">
      <div className="max-w-[1200px] mx-auto px-6 py-3">
        <p className="text-xs text-[#4a5568] leading-relaxed">
          <strong className="font-semibold text-[#1a3252]">Christian Wimmer</strong>
          {' '}berät seit 20 Jahren in allen Personen-Versicherungen.
          {' '}<Link href="/" className="underline decoration-dotted underline-offset-2 hover:text-[#02a9e6]">
            Sterbegeld24Plus.de
          </Link>
          {' '}ist sein Hauptauftritt — von hier aus auch Berufsunfähigkeit,
          Pflege und Unfall.
        </p>
      </div>
    </aside>
  )
}
