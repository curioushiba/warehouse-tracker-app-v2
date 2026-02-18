import React from 'react'
import { render } from '@testing-library/react-native'
import { ScanSuccessOverlay } from './ScanSuccessOverlay'

describe('ScanSuccessOverlay', () => {
  it('is not visible when isVisible is false', () => {
    const { queryByTestId } = render(
      <ScanSuccessOverlay
        item={{ name: 'Widget' }}
        isVisible={false}
        testID="overlay"
      />
    )
    expect(queryByTestId('overlay')).toBeNull()
  })

  it('shows item name when isVisible is true', () => {
    const { getByText, getByTestId } = render(
      <ScanSuccessOverlay
        item={{ name: 'Widget' }}
        isVisible={true}
        testID="overlay"
      />
    )
    expect(getByTestId('overlay')).toBeTruthy()
    expect(getByText('Widget')).toBeTruthy()
  })

  it('shows image when item has imageUrl', () => {
    const { getByTestId } = render(
      <ScanSuccessOverlay
        item={{ name: 'Widget', imageUrl: 'https://example.com/img.png' }}
        isVisible={true}
        testID="overlay"
      />
    )
    expect(getByTestId('overlay-image')).toBeTruthy()
  })

  it('shows placeholder when no imageUrl', () => {
    const { getByTestId, queryByTestId } = render(
      <ScanSuccessOverlay
        item={{ name: 'Widget' }}
        isVisible={true}
        testID="overlay"
      />
    )
    expect(queryByTestId('overlay-image')).toBeNull()
    expect(getByTestId('overlay-placeholder')).toBeTruthy()
  })

  it('is hidden when item is null', () => {
    const { queryByTestId } = render(
      <ScanSuccessOverlay item={null} isVisible={true} testID="overlay" />
    )
    expect(queryByTestId('overlay')).toBeNull()
  })
})
