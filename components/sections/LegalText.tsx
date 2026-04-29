// LegalText — renders legal page content as a simple prose layout.
// Each block has a heading (h2) and a body (plain text, supports \n for paragraphs).

interface LegalTextBlock {
  heading: string
  body: string
}

interface LegalTextProps {
  blocks: LegalTextBlock[]
}

export function LegalText({ blocks }: LegalTextProps) {
  return (
    <div className="prose prose-sm max-w-none text-[#333333]">
      {blocks.map((block, i) => (
        <div key={i} className="mb-8">
          <h2 className="text-lg font-semibold text-[#1a365d] mb-3">{block.heading}</h2>
          {block.body.split('\n').filter(Boolean).map((para, j) => (
            <p key={j} className="mb-2 text-sm leading-relaxed text-[#666666]">
              {para}
            </p>
          ))}
        </div>
      ))}
    </div>
  )
}
