/**
 * Atomic Card component — a white rounded container with a border divider.
 *
 * Uses design token border colour (#e5e5e5) and a subtle shadow.
 * Accepts an optional className for layout overrides (e.g. max-w-*, mx-auto).
 * Works in both Server and Client Components — no "use client" directive needed.
 */
import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={[
        'rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
