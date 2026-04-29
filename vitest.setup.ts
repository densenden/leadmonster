// Global Vitest setup — provides default mocks for next/navigation hooks
// that components use during tests. Individual test files can override
// these mocks via vi.mock() calls.

import { vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Default mock for next/navigation. Tests that need specific behavior
// (e.g. router.push spies) should still call vi.mock('next/navigation', ...)
// at the top of their file — vitest's hoisted mocks take precedence.
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})
