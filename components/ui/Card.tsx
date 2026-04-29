/**
 * Card — white container with border, hover lifts with cyan border highlight.
 * Aligned with finanzteam26.de card style.
 */
import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
}

export function Card({ children, className = '', hover = true }: CardProps) {
  return (
    <div
      className={[
        'rounded-lg border border-[#e2e8f0] bg-white p-6',
        hover ? 'transition-all duration-200 hover:shadow-md hover:border-[#02a9e6]' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
