'use client'

// Shared lock for content generators on the produkt-content page.
// Only one generator (Hauptgenerator oder Ratgeber-Generator) darf gleichzeitig
// laufen, weil /api/generate keine Concurrent-Calls pro Produkt unterstützt.
//
// Konvention für `owner`:
//   - 'main'      → Haupt-Generator (alle Seitentypen)
//   - 'ratgeber'  → Einzelner Ratgeber-Artikel
//
// Verbraucher checken `lockedBy`:
//   null               → Niemand generiert, eigenen Button freigeben
//   eigener owner      → Wir laufen, eigenes Loading-UI zeigen
//   anderer owner      → Disabled-Hinweis „Anderer Generator läuft…"
import { createContext, useContext, useState, type ReactNode } from 'react'

type GeneratorOwner = 'main' | 'ratgeber'

interface GenerationLockValue {
  lockedBy: GeneratorOwner | null
  acquire: (owner: GeneratorOwner) => boolean
  release: (owner: GeneratorOwner) => void
}

const Ctx = createContext<GenerationLockValue | null>(null)

export function GenerationLockProvider({ children }: { children: ReactNode }) {
  const [lockedBy, setLockedBy] = useState<GeneratorOwner | null>(null)

  // Atomar: nur freigeben, wenn Lock entweder leer ist oder bereits dem
  // gleichen Owner gehört (Idempotenz beim Re-Click).
  function acquire(owner: GeneratorOwner): boolean {
    if (lockedBy && lockedBy !== owner) return false
    setLockedBy(owner)
    return true
  }

  function release(owner: GeneratorOwner) {
    setLockedBy(prev => (prev === owner ? null : prev))
  }

  return <Ctx.Provider value={{ lockedBy, acquire, release }}>{children}</Ctx.Provider>
}

export function useGenerationLock(): GenerationLockValue {
  const v = useContext(Ctx)
  if (!v) {
    throw new Error('useGenerationLock muss innerhalb von <GenerationLockProvider> aufgerufen werden')
  }
  return v
}
