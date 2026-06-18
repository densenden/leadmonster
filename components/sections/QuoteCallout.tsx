// Pull-Quote als visueller Anker zwischen Sektionen.
// Server Component.
import { InlineMarkdown } from '@/components/util/InlineMarkdown'
import { PortraitCircle } from '@/components/ui/PortraitCircle'

interface QuoteCalloutProps {
  quote: string
  author?: string
  author_role?: string
  author_image_url?: string
}

export function QuoteCallout({
  quote,
  author,
  author_role,
  author_image_url,
}: QuoteCalloutProps) {
  return (
    <section className="py-[70px] px-6 bg-[#f8f8f8]">
      <figure className="max-w-3xl mx-auto text-center">
        <svg
          aria-hidden="true"
          className="w-12 h-12 text-[#d4af37] mx-auto mb-6 opacity-70"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M7.17 6C4.5 6 2.5 8.06 2.5 10.83c0 2.05 1.08 3.42 2.66 3.42.6 0 .92-.16 1.16-.43-.32 1.32-1.43 2.4-2.96 2.95l.83 1.66c2.9-1.04 5.16-3.74 5.16-7.16C9.35 7.96 8.46 6 7.17 6Zm9.33 0c-2.67 0-4.67 2.06-4.67 4.83 0 2.05 1.08 3.42 2.66 3.42.6 0 .92-.16 1.16-.43-.32 1.32-1.43 2.4-2.96 2.95l.83 1.66c2.9-1.04 5.16-3.74 5.16-7.16C18.68 7.96 17.79 6 16.5 6Z" />
        </svg>
        <blockquote className="text-xl md:text-2xl font-heading text-[#1a365d] leading-snug mb-6">
          <InlineMarkdown linkClassName="text-[#02a9e6] hover:underline">{quote}</InlineMarkdown>
        </blockquote>
        {(author || author_role) && (
          <figcaption className="flex items-center justify-center gap-3 text-sm">
            {author_image_url && (
              <PortraitCircle
                src={author_image_url}
                alt={author ?? ''}
                className="w-10 h-10"
              />
            )}
            <span>
              {author && <span className="font-semibold text-[#1a365d]">{author}</span>}
              {author && author_role && <span className="text-[#999] mx-1">·</span>}
              {author_role && <span className="text-[#666]">{author_role}</span>}
            </span>
          </figcaption>
        )}
      </figure>
    </section>
  )
}
