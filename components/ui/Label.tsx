// Form-Label-Atom. Konsistente Optik über alle Formulare.
import * as React from 'react'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Pflicht-Markierung (Stern rechts neben dem Label). */
  required?: boolean
}

export function Label({ required, className = '', children, ...rest }: LabelProps) {
  return (
    <label
      className={`block text-sm font-semibold text-[#1a365d] mb-1.5 ${className}`}
      {...rest}
    >
      {children}
      {required && (
        <span aria-hidden="true" className="text-[#c0392b] ml-1">
          *
        </span>
      )}
    </label>
  )
}
