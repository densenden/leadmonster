/**
 * Atomic Badge component for rendering label chips, tag pills, and status indicators.
 *
 * variant prop colour mapping:
 *   - 'success' → green background (bg-green-100 text-green-800) — for positive states (synced, sent)
 *   - 'danger'  → red background (bg-red-100 text-red-800) — for error states (not synced, failed)
 *   - 'neutral' → muted grey background (bg-gray-100 text-gray-700) — for informational tags
 *   - 'info'    → blue background (bg-blue-100 text-blue-700) — for neutral informational labels
 *
 * No "use client" directive — pure presentational, works in Server and Client Components.
 */
import type { ReactNode } from 'react'

export type BadgeVariant = 'neutral' | 'success' | 'danger' | 'info'

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-700',
}

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
}

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variantClasses[variant]}`}
    >
      {children}
    </span>
  )
}
