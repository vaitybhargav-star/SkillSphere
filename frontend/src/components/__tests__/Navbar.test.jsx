import React from 'react'
import { render, screen } from '@testing-library/react'
import Navbar from '../Navbar'
import { MemoryRouter } from 'react-router-dom'

describe('Navbar', () => {
  test('renders links and brand', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    )

    expect(screen.getByText('SkillSphere')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Marketplace')).toBeInTheDocument()
  })
})
