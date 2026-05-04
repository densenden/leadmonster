// Tests für TrustStoryLine — die wiederkehrende Trust-Story-H2 unter dem
// Header bei Nicht-Sterbegeld-Subpfaden (§ 8 Phase 4 Mitigation 3).
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrustStoryLine } from '../TrustStoryLine'

describe('TrustStoryLine', () => {
  it('renders Christian Wimmer as the trust anchor', () => {
    render(<TrustStoryLine />)
    expect(screen.getByText(/Christian Wimmer/)).toBeDefined()
  })

  it('mentions all four cross-product categories', () => {
    render(<TrustStoryLine />)
    const text = screen.getByRole('complementary').textContent ?? ''
    // Sterbegeld24Plus + BU + Pflege + Unfall — alle in der Story-Linie genannt.
    expect(text).toMatch(/Sterbegeld24Plus/i)
    expect(text).toMatch(/Berufsunfähigkeit/i)
    expect(text).toMatch(/Pflege/i)
    expect(text).toMatch(/Unfall/i)
  })

  it('links Sterbegeld24Plus to the root path', () => {
    render(<TrustStoryLine />)
    const link = screen.getByRole('link', { name: /Sterbegeld24Plus/i })
    expect(link.getAttribute('href')).toBe('/')
  })

  it('uses semantic <aside> wrapper (complementary landmark)', () => {
    render(<TrustStoryLine />)
    expect(screen.getByRole('complementary')).toBeDefined()
  })
})
