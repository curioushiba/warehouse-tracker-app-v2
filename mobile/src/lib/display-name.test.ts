import { describe, it, expect } from 'vitest'
import { getDisplayName } from './display-name'

describe('getDisplayName', () => {
  it('returns name when present', () => {
    expect(getDisplayName({ name: 'John Doe' })).toBe('John Doe')
  })

  it('returns "first last" when name is empty but first/last present', () => {
    expect(getDisplayName({ first_name: 'John', last_name: 'Doe' })).toBe('John Doe')
  })

  it('returns first_name when only first_name present', () => {
    expect(getDisplayName({ first_name: 'John' })).toBe('John')
  })

  it('returns last_name when only last_name present', () => {
    expect(getDisplayName({ last_name: 'Doe' })).toBe('Doe')
  })

  it('returns username when no name fields', () => {
    expect(getDisplayName({ username: 'johndoe' })).toBe('johndoe')
  })

  it('returns email prefix when only email present', () => {
    expect(getDisplayName({ email: 'john@example.com' })).toBe('john')
  })

  it('returns "User" when nothing available', () => {
    expect(getDisplayName({})).toBe('User')
  })

  it('returns "User" for null/undefined profile', () => {
    expect(getDisplayName(null)).toBe('User')
    expect(getDisplayName(undefined)).toBe('User')
  })

  it('trims whitespace', () => {
    expect(getDisplayName({ name: '  John Doe  ' })).toBe('John Doe')
  })

  it('treats whitespace-only name as empty', () => {
    expect(getDisplayName({ name: '   ', username: 'johndoe' })).toBe('johndoe')
  })

  it('treats whitespace-only first/last as empty', () => {
    expect(getDisplayName({ first_name: '  ', last_name: '  ', username: 'jd' })).toBe('jd')
  })
})
