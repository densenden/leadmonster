/**
 * Button — outline-first design aligned with finanzteam26.de brand.
 *
 * All variants are border/outline by default: transparent background,
 * colored border + text, filled on hover. Solid filled variants are
 * available via 'solid-primary' and 'solid-accent'.
 *
 * variants:
 *   'primary'       — cyan outline → filled cyan on hover
 *   'secondary'     — navy outline → filled navy on hover
 *   'accent'        — orange outline → filled orange on hover
 *   'inverse'       — white outline → white-filled + navy text on hover (for dark bg)
 *   'solid-primary' — filled cyan (strong CTA)
 *   'solid-accent'  — filled orange (primary CTA)
 *   'ghost'         — no border, muted text
 *
 * size: 'sm' | 'md' (default) | 'lg'
 */
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'inverse'
  | 'solid-primary'
  | 'solid-accent'
  | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  'primary':
    'border-[1.5px] border-[#02a9e6] text-[#02a9e6] bg-transparent hover:bg-[#02a9e6] hover:text-white focus-visible:ring-2 focus-visible:ring-[#02a9e6]/50',
  'secondary':
    'border-[1.5px] border-[#1a3252] text-[#1a3252] bg-transparent hover:bg-[#1a3252] hover:text-white focus-visible:ring-2 focus-visible:ring-[#1a3252]/40',
  'accent':
    'border-[1.5px] border-[#f26522] text-[#f26522] bg-transparent hover:bg-[#f26522] hover:text-white focus-visible:ring-2 focus-visible:ring-[#f26522]/50',
  'inverse':
    'border-[1.5px] border-white text-white bg-transparent hover:bg-white hover:text-[#1a3252] focus-visible:ring-2 focus-visible:ring-white/50',
  'solid-primary':
    'bg-[#02a9e6] border-[1.5px] border-[#02a9e6] text-white hover:bg-[#0189bc] hover:border-[#0189bc] focus-visible:ring-2 focus-visible:ring-[#02a9e6]/50',
  'solid-accent':
    'bg-[#f26522] border-[1.5px] border-[#f26522] text-white hover:bg-[#d4511a] hover:border-[#d4511a] focus-visible:ring-2 focus-visible:ring-[#f26522]/50',
  'ghost':
    'border-[1.5px] border-transparent text-[#4a5568] bg-transparent hover:bg-[#e1f0fb] hover:text-[#1a3252] focus-visible:ring-2 focus-visible:ring-gray-300/60',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-1.5 text-[13px]',
  md: 'px-6 py-2.5 text-[15px]',
  lg: 'px-8 py-3.5 text-[16px]',
}

interface ButtonBaseProps {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  className?: string
}

type ButtonAsButton = ButtonBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { as?: 'button' }

type ButtonAsAnchor = ButtonBaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { as: 'a' }

type ButtonProps = ButtonAsButton | ButtonAsAnchor

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const classes = [
    'inline-flex items-center justify-center gap-2',
    'rounded-md font-semibold tracking-wide',
    'transition-all duration-200 cursor-pointer',
    'focus-visible:outline-none',
    variantClasses[variant],
    sizeClasses[size],
    (props as ButtonHTMLAttributes<HTMLButtonElement>).disabled
      ? 'opacity-50 pointer-events-none'
      : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if ((props as ButtonAsAnchor).as === 'a') {
    const { as: _as, ...rest } = props as ButtonAsAnchor
    return (
      <a className={classes} {...rest}>
        {children}
      </a>
    )
  }

  const { as: _as, ...rest } = props as ButtonAsButton
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  )
}
