import { showToast } from './Toast'
import ToastLib from 'react-native-toast-message'

describe('showToast', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls Toast.show with success type for success status', () => {
    showToast({ message: 'Saved!', status: 'success' })
    expect(ToastLib.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        text1: 'Saved!',
      })
    )
  })

  it('calls Toast.show with error type for error status', () => {
    showToast({ message: 'Failed!', status: 'error' })
    expect(ToastLib.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        text1: 'Failed!',
      })
    )
  })

  it('calls Toast.show with info type for info status', () => {
    showToast({ message: 'Note', status: 'info' })
    expect(ToastLib.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'info',
        text1: 'Note',
      })
    )
  })

  it('maps warning status to info type', () => {
    showToast({ message: 'Careful', status: 'warning' })
    expect(ToastLib.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'info',
        text1: 'Careful',
      })
    )
  })

  it('default duration is 3000', () => {
    showToast({ message: 'Hello', status: 'success' })
    expect(ToastLib.show).toHaveBeenCalledWith(
      expect.objectContaining({
        visibilityTime: 3000,
      })
    )
  })

  it('custom duration is passed through', () => {
    showToast({ message: 'Quick', status: 'info', duration: 1500 })
    expect(ToastLib.show).toHaveBeenCalledWith(
      expect.objectContaining({
        visibilityTime: 1500,
      })
    )
  })
})
