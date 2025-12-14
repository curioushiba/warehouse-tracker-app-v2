import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScanSuccessOverlay } from './ScanSuccessOverlay'

describe('ScanSuccessOverlay', () => {
  const mockItem = {
    itemName: 'Test Product',
    itemImageUrl: 'https://example.com/image.jpg',
  }

  describe('rendering', () => {
    it('renders nothing when not visible', () => {
      const { container } = render(
        <ScanSuccessOverlay item={mockItem} isVisible={false} isExiting={false} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when item is null', () => {
      const { container } = render(
        <ScanSuccessOverlay item={null} isVisible={true} isExiting={false} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('renders overlay when visible with item', () => {
      render(
        <ScanSuccessOverlay item={mockItem} isVisible={true} isExiting={false} />
      )

      expect(screen.getByText('Test Product')).toBeInTheDocument()
      expect(screen.getByText('Added!')).toBeInTheDocument()
    })

    it('renders item name correctly', () => {
      const customItem = { itemName: 'Custom Item Name', itemImageUrl: null }
      render(
        <ScanSuccessOverlay item={customItem} isVisible={true} isExiting={false} />
      )

      expect(screen.getByText('Custom Item Name')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has role="status" for screen readers', () => {
      render(
        <ScanSuccessOverlay item={mockItem} isVisible={true} isExiting={false} />
      )

      const overlay = screen.getByRole('status')
      expect(overlay).toBeInTheDocument()
    })

    it('has aria-live="polite" for announcements', () => {
      render(
        <ScanSuccessOverlay item={mockItem} isVisible={true} isExiting={false} />
      )

      const overlay = screen.getByRole('status')
      expect(overlay).toHaveAttribute('aria-live', 'polite')
    })

    it('has descriptive aria-label with item name', () => {
      render(
        <ScanSuccessOverlay item={mockItem} isVisible={true} isExiting={false} />
      )

      const overlay = screen.getByRole('status')
      expect(overlay).toHaveAttribute('aria-label', 'Test Product added to list')
    })

    it('updates aria-label for different items', () => {
      const anotherItem = { itemName: 'Another Product', itemImageUrl: null }
      render(
        <ScanSuccessOverlay item={anotherItem} isVisible={true} isExiting={false} />
      )

      const overlay = screen.getByRole('status')
      expect(overlay).toHaveAttribute('aria-label', 'Another Product added to list')
    })
  })

  describe('animations', () => {
    it('applies entrance animation when not exiting', () => {
      render(
        <ScanSuccessOverlay item={mockItem} isVisible={true} isExiting={false} />
      )

      const overlay = screen.getByRole('status')
      expect(overlay.className).toContain('animate-fade-in')
      expect(overlay.className).not.toContain('animate-fade-out')
    })

    it('applies exit animation when exiting', () => {
      render(
        <ScanSuccessOverlay item={mockItem} isVisible={true} isExiting={true} />
      )

      const overlay = screen.getByRole('status')
      expect(overlay.className).toContain('animate-fade-out')
      expect(overlay.className).not.toContain('animate-fade-in')
    })
  })

  describe('styling', () => {
    it('has pointer-events-none to not block interactions', () => {
      render(
        <ScanSuccessOverlay item={mockItem} isVisible={true} isExiting={false} />
      )

      const overlay = screen.getByRole('status')
      expect(overlay.className).toContain('pointer-events-none')
    })

    it('is positioned fixed with high z-index', () => {
      render(
        <ScanSuccessOverlay item={mockItem} isVisible={true} isExiting={false} />
      )

      const overlay = screen.getByRole('status')
      expect(overlay.className).toContain('fixed')
      expect(overlay.className).toContain('z-50')
    })
  })

  describe('image handling', () => {
    it('renders with image when imageUrl is provided', () => {
      render(
        <ScanSuccessOverlay item={mockItem} isVisible={true} isExiting={false} />
      )

      const image = screen.getByRole('img')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', mockItem.itemImageUrl)
    })

    it('renders placeholder when imageUrl is null', () => {
      const itemWithoutImage = { itemName: 'No Image Item', itemImageUrl: null }
      render(
        <ScanSuccessOverlay item={itemWithoutImage} isVisible={true} isExiting={false} />
      )

      // Should still render without crashing
      expect(screen.getByText('No Image Item')).toBeInTheDocument()
      // No img element when using placeholder (ItemImage shows icon instead)
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })
  })
})
