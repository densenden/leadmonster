// Textarea-Atom. Optisch identisch mit Input, aber resize-y + min-h-32.
import * as React from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className = '', ...rest },
  ref,
) {
  const base =
    'block w-full min-h-[7rem] px-4 py-3 text-base text-[#1a365d] bg-white border rounded-lg ' +
    'placeholder:text-[#999] resize-y ' +
    'focus:outline-none focus:ring-2 focus:ring-[#02a9e6]/40 focus:border-[#02a9e6] ' +
    'disabled:opacity-50 disabled:cursor-not-allowed ' +
    'transition-colors duration-150'
  const border = invalid
    ? 'border-[#c0392b] focus:border-[#c0392b] focus:ring-[#c0392b]/30'
    : 'border-gray-300'
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`${base} ${border} ${className}`}
      {...rest}
    />
  )
})
