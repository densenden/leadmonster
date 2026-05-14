/**
 * InlineMarkdown — renders short text containing `[label](/path)` link syntax
 * as React nodes with real <a> elements.
 *
 * Why this exists:
 *   The post-processor's auto-cross-linker (lib/linker/auto-link.ts) injects
 *   markdown link syntax into headlines, sublines, feature titles etc. The
 *   underlying components render those strings as plain text via JSX, so
 *   `[Sterbegeld](/wissen/was-ist-sterbegeld)` shows up literally on the page.
 *
 *   This component parses inline `[text](url)` and emits <a> for each match,
 *   keeping the rest as plain text. Server-component-safe (no client hooks).
 *
 * Scope:
 *   - Only handles `[text](url)` inline links — no other markdown syntax.
 *   - Use only on SHORT strings (headlines, item.text, item.title). For
 *     long-form prose use lib/markdown/render.ts which handles full markdown.
 */
import React from 'react'
import Link from 'next/link'

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g

interface InlineMarkdownProps {
  children: string | null | undefined
  /** Optional className applied to <a> tags. */
  linkClassName?: string
}

/**
 * Parses non-link text chunks for inline `**bold**` and `*italic*` segments
 * and emits <strong> / <em> with brand classes. Without this step, the
 * auto-cross-linker can inject bold markdown into headlines/paragraphs
 * that then renders as literal asterisks.
 */
function renderInlineEmphasis(text: string, baseKey: number): React.ReactNode[] {
  const out: React.ReactNode[] = []
  let cursor = 0
  let i = 0
  while (cursor < text.length) {
    const remaining = text.slice(cursor)
    const bold = /^\*\*([^*]+)\*\*/.exec(remaining)
    if (bold) {
      out.push(
        <strong key={`b-${baseKey}-${i++}`} className="font-bold text-[#1a365d]">
          {bold[1]}
        </strong>,
      )
      cursor += bold[0].length
      continue
    }
    const italic = /^\*([^*]+)\*/.exec(remaining)
    if (italic) {
      out.push(
        <em key={`i-${baseKey}-${i++}`} className="italic">
          {italic[1]}
        </em>,
      )
      cursor += italic[0].length
      continue
    }
    // Plain bis zum nächsten Trigger
    const next = remaining.search(/\*\*|\*/)
    const len = next === -1 ? remaining.length : Math.max(next, 1)
    out.push(text.slice(cursor, cursor + len))
    cursor += len
  }
  return out
}

export function InlineMarkdown({ children, linkClassName }: InlineMarkdownProps) {
  if (!children) return null

  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  // Reset regex state between calls
  LINK_RE.lastIndex = 0
  while ((match = LINK_RE.exec(children)) !== null) {
    if (match.index > lastIndex) {
      const chunk = children.slice(lastIndex, match.index)
      nodes.push(...renderInlineEmphasis(chunk, key++))
    }
    const [, label, url] = match
    // Internal link → next/link; external → plain anchor with target=_blank.
    // Special case: /wissen/* links (auto-cross-linker fallback) open in a
    // new tab so the user stays on the product page they were reading.
    const isExternal = /^https?:\/\//i.test(url)
    const isWissenJump = url.startsWith('/wissen/')
    if (isExternal) {
      nodes.push(
        <a key={key++} href={url} target="_blank" rel="noopener noreferrer" className={linkClassName}>
          {label}
        </a>,
      )
    } else if (isWissenJump) {
      nodes.push(
        <Link key={key++} href={url} target="_blank" rel="noopener" className={linkClassName}>
          {label}
        </Link>,
      )
    } else {
      nodes.push(
        <Link key={key++} href={url} className={linkClassName}>
          {label}
        </Link>,
      )
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < children.length) {
    const chunk = children.slice(lastIndex)
    nodes.push(...renderInlineEmphasis(chunk, key++))
  }

  // Single-element optimization — return string directly if no links matched.
  if (nodes.length === 0) return children
  return <>{nodes}</>
}
