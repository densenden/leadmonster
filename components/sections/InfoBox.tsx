// Info-/Tipp-/Warn-Kasten. Verlinkt typischerweise zum Wissensfundus.
// Server Component. Variante = visuelle Codierung.
import { InlineMarkdown } from '@/components/util/InlineMarkdown'

interface InfoBoxProps {
  variant?: 'info' | 'warning' | 'tip'
  headline: string
  body: string
  cta_label?: string
  cta_href?: string
  /** Wenn true → eigenständige Section mit Container. False = inline für Ratgeber-Article. */
  asSection?: boolean
}

const VARIANT_STYLES: Record<
  NonNullable<InfoBoxProps['variant']>,
  { border: string; bg: string; icon: string; iconSvg: React.ReactNode }
> = {
  info: {
    border: 'border-[#02a9e6]',
    bg: 'bg-[#abd5f4]/20',
    icon: '#02a9e6',
    iconSvg: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
      />
    ),
  },
  warning: {
    border: 'border-[#d4af37]',
    bg: 'bg-[#fef3c7]/40',
    icon: '#b8860b',
    iconSvg: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
      />
    ),
  },
  tip: {
    border: 'border-[#10b981]',
    bg: 'bg-[#d1fae5]/40',
    icon: '#059669',
    iconSvg: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.4 14.4 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
      />
    ),
  },
}

export function InfoBox({
  variant = 'info',
  headline,
  body,
  cta_label,
  cta_href,
  asSection = true,
}: InfoBoxProps) {
  const v = VARIANT_STYLES[variant]
  const box = (
    <div className={`border-l-4 ${v.border} ${v.bg} p-5 md:p-6 rounded-r-lg`}>
      <div className="flex gap-4">
        <svg
          aria-hidden="true"
          className="w-6 h-6 flex-shrink-0 mt-0.5"
          style={{ color: v.icon }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          {v.iconSvg}
        </svg>
        <div className="flex-1">
          <p className="font-bold text-[#1a365d] font-heading mb-2">{headline}</p>
          <p className="text-sm text-[#333] font-body leading-relaxed">
            <InlineMarkdown linkClassName="text-[#02a9e6] hover:underline">{body}</InlineMarkdown>
          </p>
          {cta_label && cta_href && (
            <a
              href={cta_href}
              className="inline-block mt-3 text-sm font-semibold text-[#1a365d] hover:underline"
            >
              {cta_label} →
            </a>
          )}
        </div>
      </div>
    </div>
  )

  if (!asSection) return box

  return (
    <section className="py-10 px-6 bg-white">
      <div className="max-w-3xl mx-auto">{box}</div>
    </section>
  )
}
