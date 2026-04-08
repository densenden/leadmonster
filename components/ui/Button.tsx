/**
 * Atomic Button component — covers primary, secondary/outline, and ghost variants.
 *
 * variant prop:
 *   - 'primary'   → solid brand blue background (#abd5f4) with dark text
 *   - 'secondary' → orange accent background (#ff9651) with white text
 *   - 'outline'   → transparent with border, brand-blue border and text
 *   - 'ghost'     → no border, muted text, light hover background
 *
 * Disabled and loading states dim the button and prevent pointer events.
 * Works in both Server Components (static usage) and Client Components (event handlers).
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#abd5f4] text-[#333333] hover:bg-[#91c7ef] focus:ring-2 focus:ring-[#abd5f4]/60 focus:outline-none',
  secondary:
    'bg-[#ff9651] text-white hover:bg-[#e8843d] focus:ring-2 focus:ring-[#ff9651]/60 focus:outline-none',
  outline:
    'border border-[#abd5f4] text-[#1a365d] bg-transparent hover:bg-[#e1f0fb] focus:ring-2 focus:ring-[#abd5f4]/60 focus:outline-none',
  ghost:
    'bg-transparent text-[#666666] hover:bg-gray-100 focus:ring-2 focus:ring-gray-300/60 focus:outline-none',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
        variantClasses[variant],
        props.disabled ? 'cursor-not-allowed opacity-50' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
