// Tests for the Badge UI component — pure render tests, no mocks required.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { Badge } from '../Badge'

describe('Badge — variant colours', () => {
  it('renders success variant with green colour classes', () => {
    const { container } = render(<Badge variant="success">Ja</Badge>)
    const span = container.querySelector('span')
    expect(span?.className).toContain('bg-green-100')
    expect(span?.className).toContain('text-green-800')
  })

  it('renders danger variant with red colour classes', () => {
    const { container } = render(<Badge variant="danger">Nein</Badge>)
    const span = container.querySelector('span')
    expect(span?.className).toContain('bg-red-100')
    expect(span?.className).toContain('text-red-800')
  })

  it('renders neutral variant with grey colour classes', () => {
    const { container } = render(<Badge variant="neutral">sofortschutz</Badge>)
    const span = container.querySelector('span')
    expect(span?.className).toContain('bg-gray-100')
    expect(span?.className).toContain('text-gray-700')
  })

  it('renders children content inside the badge span', () => {
    render(<Badge variant="success">Synced</Badge>)
    expect(screen.getByText('Synced')).toBeDefined()
  })
})
