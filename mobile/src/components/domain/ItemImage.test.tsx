import React from 'react'
import { render } from '@testing-library/react-native'
import { ItemImage } from './ItemImage'

describe('ItemImage', () => {
  it('renders image when uri provided', () => {
    const { getByTestId } = render(
      <ItemImage uri="https://example.com/img.png" testID="item-img" />
    )
    expect(getByTestId('item-img-image')).toBeTruthy()
  })

  it('shows placeholder when uri is null', () => {
    const { getByTestId, queryByTestId } = render(
      <ItemImage uri={null} testID="item-img" />
    )
    expect(queryByTestId('item-img-image')).toBeNull()
    expect(getByTestId('item-img-placeholder')).toBeTruthy()
  })

  it('shows placeholder when uri is undefined', () => {
    const { getByTestId, queryByTestId } = render(
      <ItemImage testID="item-img" />
    )
    expect(queryByTestId('item-img-image')).toBeNull()
    expect(getByTestId('item-img-placeholder')).toBeTruthy()
  })

  it('applies size prop to dimensions (default 64)', () => {
    const { getByTestId } = render(
      <ItemImage uri="https://example.com/img.png" testID="item-img" />
    )
    const image = getByTestId('item-img-image')
    expect(image.props.style).toEqual(
      expect.objectContaining({ width: 64, height: 64 })
    )
  })

  it('applies custom size prop', () => {
    const { getByTestId } = render(
      <ItemImage uri="https://example.com/img.png" size={100} testID="item-img" />
    )
    const image = getByTestId('item-img-image')
    expect(image.props.style).toEqual(
      expect.objectContaining({ width: 100, height: 100 })
    )
  })

  it('shows placeholder for empty string uri', () => {
    const { getByTestId, queryByTestId } = render(
      <ItemImage uri="" testID="item-img" />
    )
    expect(queryByTestId('item-img-image')).toBeNull()
    expect(getByTestId('item-img-placeholder')).toBeTruthy()
  })
})
