// TypeScript compile-time type assertion tests for lib/supabase/types.ts.
// These tests use Vitest's `expectTypeOf` to confirm the Database type exposes
// correct table-level shapes without making any network calls.
import { expectTypeOf, it } from 'vitest'
import type { Database } from '../types'

// Extract the Row shape for the `produkte` table for assertion.
type ProdukteRow = Database['public']['Tables']['produkte']['Row']

it('Database["public"]["Tables"]["produkte"]["Row"] has expected required fields', () => {
  // Confirm `id` is a string.
  expectTypeOf<ProdukteRow['id']>().toEqualTypeOf<string>()

  // Confirm `slug` is a string (UNIQUE NOT NULL in schema).
  expectTypeOf<ProdukteRow['slug']>().toEqualTypeOf<string>()

  // Confirm `name` is a string (NOT NULL in schema).
  expectTypeOf<ProdukteRow['name']>().toEqualTypeOf<string>()

  // Confirm `typ` is a string (CHECK constraint: sterbegeld | pflege | leben | unfall).
  expectTypeOf<ProdukteRow['typ']>().toEqualTypeOf<string>()

  // Confirm `status` is a string (CHECK constraint: entwurf | aktiv | archiviert).
  expectTypeOf<ProdukteRow['status']>().toEqualTypeOf<string>()

  // Confirm `domain` is nullable (optional field in schema).
  expectTypeOf<ProdukteRow['domain']>().toEqualTypeOf<string | null>()
})
