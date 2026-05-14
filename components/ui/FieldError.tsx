// Fehler-Anzeige unter einem Form-Field. Rendert auch im idle-State leer,
// damit der Layout-Sprung beim Erscheinen verhindert wird.
import * as React from 'react'

interface FieldErrorProps {
  id?: string
  children?: React.ReactNode
}

export function FieldError({ id, children }: FieldErrorProps) {
  return (
    <p
      id={id}
      role="alert"
      className="text-xs text-[#c0392b] mt-1.5 min-h-[1rem] leading-snug"
    >
      {children ?? ''}
    </p>
  )
}
