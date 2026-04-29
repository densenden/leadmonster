/**
 * Mini-Markdown → React-Renderer (Server-Component-safe).
 *
 * Bewusst minimalistisch — wir wollen keine schwere Lib für
 * den Blog/Wissen-Bereich. Unterstützt:
 *   - Überschriften (# … ######)
 *   - Absätze
 *   - Fett (**text**), Kursiv (*text*)
 *   - Inline-Code (`code`)
 *   - Links [text](url)
 *   - Ungeordnete Listen (- item)
 *   - Geordnete Listen (1. item)
 *   - Tabellen (| h1 | h2 | und |--|--|)
 *
 * Für anspruchsvolle Inhalte später durch z. B. `react-markdown`
 * + remark-gfm ersetzen — aber erst nach Bedarf.
 */
import * as React from 'react'

interface InlineSegment {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
  href?: string
}

function parseInline(line: string): InlineSegment[] {
  // Order: links → bold → italic → code → plain
  const segments: InlineSegment[] = []
  let cursor = 0

  // Sehr einfacher sequentieller Tokenizer
  while (cursor < line.length) {
    const remaining = line.slice(cursor)

    // Link [text](url)
    const link = /^\[([^\]]+)\]\(([^)]+)\)/.exec(remaining)
    if (link) {
      segments.push({ text: link[1], href: link[2] })
      cursor += link[0].length
      continue
    }
    // Inline code `…`
    const code = /^`([^`]+)`/.exec(remaining)
    if (code) {
      segments.push({ text: code[1], code: true })
      cursor += code[0].length
      continue
    }
    // Bold **…**
    const bold = /^\*\*([^*]+)\*\*/.exec(remaining)
    if (bold) {
      segments.push({ text: bold[1], bold: true })
      cursor += bold[0].length
      continue
    }
    // Italic *…*
    const italic = /^\*([^*]+)\*/.exec(remaining)
    if (italic) {
      segments.push({ text: italic[1], italic: true })
      cursor += italic[0].length
      continue
    }
    // Plain bis zum nächsten Trigger
    const next = remaining.search(/(\[|`|\*\*|\*)/)
    const len = next === -1 ? remaining.length : Math.max(next, 1)
    segments.push({ text: remaining.slice(0, len) })
    cursor += len
  }
  return segments
}

function renderInline(line: string, keyPrefix: string): React.ReactNode[] {
  return parseInline(line).map((seg, i) => {
    const key = `${keyPrefix}-${i}`
    if (seg.href) return React.createElement('a', { key, href: seg.href, className: 'text-[#02a9e6] hover:underline' }, seg.text)
    if (seg.bold) return React.createElement('strong', { key }, seg.text)
    if (seg.italic) return React.createElement('em', { key }, seg.text)
    if (seg.code) return React.createElement('code', { key, className: 'bg-gray-100 px-1 rounded text-[0.95em]' }, seg.text)
    return React.createElement('span', { key }, seg.text)
  })
}

export function renderMarkdown(md: string): React.ReactNode[] {
  const lines = md.split('\n')
  const blocks: React.ReactNode[] = []
  let i = 0
  let blockKey = 0

  while (i < lines.length) {
    const line = lines[i]

    // Leerzeile überspringen
    if (line.trim() === '') {
      i++
      continue
    }

    // Headings
    const h = /^(#{1,6})\s+(.*)$/.exec(line)
    if (h) {
      const level = h[1].length
      const tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
      const cls =
        level === 1 ? 'text-3xl font-bold mt-8 mb-4 text-[#1a365d]' :
        level === 2 ? 'text-2xl font-bold mt-6 mb-3 text-[#1a365d]' :
        level === 3 ? 'text-xl  font-bold mt-5 mb-2 text-[#1a365d]' :
                      'text-lg  font-semibold mt-4 mb-2 text-[#1a365d]'
      blocks.push(React.createElement(tag, { key: blockKey++, className: cls }, renderInline(h[2], `h-${blockKey}`)))
      i++
      continue
    }

    // Tabelle (sehr einfach: erste Zeile = Header, zweite = Trenner)
    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|[\s\-|]+\|\s*$/.test(lines[i + 1])) {
      const headerCells = line.split('|').slice(1, -1).map(s => s.trim())
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].split('|').slice(1, -1).map(s => s.trim()))
        i++
      }
      blocks.push(
        React.createElement(
          'div',
          { key: blockKey++, className: 'overflow-x-auto my-6' },
          React.createElement(
            'table',
            { className: 'min-w-full border-collapse text-sm' },
            React.createElement(
              'thead',
              null,
              React.createElement(
                'tr',
                null,
                headerCells.map((c, idx) =>
                  React.createElement('th', { key: idx, className: 'border-b-2 border-[#1a365d] py-2 px-3 text-left font-semibold' }, renderInline(c, `th-${idx}`)),
                ),
              ),
            ),
            React.createElement(
              'tbody',
              null,
              rows.map((row, rIdx) =>
                React.createElement(
                  'tr',
                  { key: rIdx, className: 'border-b border-gray-200' },
                  row.map((cell, cIdx) =>
                    React.createElement('td', { key: cIdx, className: 'py-2 px-3' }, renderInline(cell, `td-${rIdx}-${cIdx}`)),
                  ),
                ),
              ),
            ),
          ),
        ),
      )
      continue
    }

    // Listen (- oder * oder 1.)
    if (/^[\s]*[-*]\s+/.test(line) || /^[\s]*\d+\.\s+/.test(line)) {
      const ordered = /^[\s]*\d+\.\s+/.test(line)
      const items: string[] = []
      while (
        i < lines.length &&
        ((ordered && /^[\s]*\d+\.\s+/.test(lines[i])) ||
          (!ordered && /^[\s]*[-*]\s+/.test(lines[i])))
      ) {
        items.push(lines[i].replace(/^[\s]*(?:[-*]|\d+\.)\s+/, ''))
        i++
      }
      const tag = ordered ? 'ol' : 'ul'
      const cls = ordered ? 'list-decimal pl-6 my-3 space-y-1' : 'list-disc pl-6 my-3 space-y-1'
      blocks.push(
        React.createElement(
          tag,
          { key: blockKey++, className: cls },
          items.map((it, idx) =>
            React.createElement('li', { key: idx }, renderInline(it, `li-${idx}`)),
          ),
        ),
      )
      continue
    }

    // Absatz — sammle aufeinanderfolgende Nicht-Leerzeilen
    const para: string[] = [line]
    i++
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,6})\s+/.test(lines[i]) && !/^[\s]*[-*]\s+/.test(lines[i]) && !lines[i].trim().startsWith('|')) {
      para.push(lines[i])
      i++
    }
    blocks.push(
      React.createElement(
        'p',
        { key: blockKey++, className: 'my-3 leading-relaxed' },
        renderInline(para.join(' '), `p-${blockKey}`),
      ),
    )
  }

  return blocks
}
