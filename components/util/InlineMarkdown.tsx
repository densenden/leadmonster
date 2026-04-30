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
      nodes.push(children.slice(lastIndex, match.index))
    }
    const [, label, url] = match
    // Internal link → next/link; external → plain anchor
    const isExternal = /^https?:\/\//i.test(url)
    if (isExternal) {
      nodes.push(
        <a key={key++} href={url} target="_blank" rel="noopener noreferrer" className={linkClassName}>
          {label}
        </a>,
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
    nodes.push(children.slice(lastIndex))
  }

  // Single-element optimization — return string directly if no links matched.
  if (nodes.length === 0) return children
  return <>{nodes}</>
}
