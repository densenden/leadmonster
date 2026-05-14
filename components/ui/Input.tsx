// Input-Atom. Höhe 48px (Touch-Target), Focus-Ring in Brand-Cyan,
// Error-Variante mit roter Border.
import * as React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className = '', ...rest },
  ref,
) {
  const base =
    'block w-full h-12 px-4 text-base text-[#1a365d] bg-white border rounded-lg ' +
    'placeholder:text-[#999] ' +
    'focus:outline-none focus:ring-2 focus:ring-[#02a9e6]/40 focus:border-[#02a9e6] ' +
    'disabled:opacity-50 disabled:cursor-not-allowed ' +
    'transition-colors duration-150'
  const border = invalid
    ? 'border-[#c0392b] focus:border-[#c0392b] focus:ring-[#c0392b]/30'
    : 'border-gray-300'
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`${base} ${border} ${className}`}
      {...rest}
    />
  )
})
