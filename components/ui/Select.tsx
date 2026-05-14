// Select-Atom. Native <select> mit konsistenter Optik wie Input.
import * as React from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, className = '', children, ...rest },
  ref,
) {
  const base =
    'block w-full h-12 px-4 pr-10 text-base text-[#1a365d] bg-white border rounded-lg ' +
    'appearance-none ' +
    'focus:outline-none focus:ring-2 focus:ring-[#02a9e6]/40 focus:border-[#02a9e6] ' +
    'disabled:opacity-50 disabled:cursor-not-allowed ' +
    'transition-colors duration-150 ' +
    "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%231a365d%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] " +
    'bg-no-repeat bg-[right_0.75rem_center]'
  const border = invalid
    ? 'border-[#c0392b] focus:border-[#c0392b] focus:ring-[#c0392b]/30'
    : 'border-gray-300'
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`${base} ${border} ${className}`}
      {...rest}
    >
      {children}
    </select>
  )
})
