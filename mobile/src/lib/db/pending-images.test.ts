import { describe, it, expect, beforeEach } from 'vitest'
import { openDatabaseSync } from 'expo-sqlite'
import { runMigrations } from './migrations'
import {
  addPendingImage,
  getPendingImages,
  getPendingImageById,
  getPendingImagesForItem,
  getPendingImagesByStatus,
  updatePendingImageStatus,
  transitionWaitingImagesToReady,
  removePendingImage,
  getPendingImageCount,
} from './pending-images'
import type { PendingImage } from '@/types/offline'

type TestDb = ReturnType<typeof openDatabaseSync>

describe('pending-images', () => {
  let db: TestDb

  beforeEach(() => {
    db = openDatabaseSync('test')
    runMigrations(db)
  })

  // ---------------------------------------------------------------------------
  // addPendingImage
  // ---------------------------------------------------------------------------
  describe('addPendingImage', () => {
    it('generates an id', () => {
      const result = addPendingImage(
        db,
        'item-1',
        'file:///data/images/photo.jpg',
        'photo.jpg',
        'image/jpeg'
      )

      expect(result.id).toBeDefined()
      expect(typeof result.id).toBe('string')
      expect(result.id.length).toBeGreaterThan(0)
    })

    it('stores the file URI', () => {
      const fileUri = 'file:///data/user/0/com.packtrack/cache/photo-abc123.jpg'
      const result = addPendingImage(db, 'item-1', fileUri, 'photo.jpg', 'image/jpeg')

      expect(result.fileUri).toBe(fileUri)
    })

    it('stores the filename', () => {
      const result = addPendingImage(
        db,
        'item-1',
        'file:///data/images/product-shot.png',
        'product-shot.png',
        'image/png'
      )

      expect(result.filename).toBe('product-shot.png')
    })

    it('stores the mimeType', () => {
      const result = addPendingImage(
        db,
        'item-1',
        'file:///data/images/photo.jpg',
        'photo.jpg',
        'image/jpeg'
      )

      expect(result.mimeType).toBe('image/jpeg')
    })

    it('stores the itemId', () => {
      const result = addPendingImage(
        db,
        'item-42',
        'file:///data/images/photo.jpg',
        'photo.jpg',
        'image/jpeg'
      )

      expect(result.itemId).toBe('item-42')
    })

    it('sets status to pending when isOfflineItem is false (default)', () => {
      const result = addPendingImage(
        db,
        'item-1',
        'file:///data/images/photo.jpg',
        'photo.jpg',
        'image/jpeg'
      )

      expect(result.status).toBe('pending')
    })

    it('sets status to pending when isOfflineItem is explicitly false', () => {
      const result = addPendingImage(
        db,
        'item-1',
        'file:///data/images/photo.jpg',
        'photo.jpg',
        'image/jpeg',
        false
      )

      expect(result.status).toBe('pending')
    })

    it('sets status to waiting_for_item when isOfflineItem is true', () => {
      const result = addPendingImage(
        db,
        'item-1',
        'file:///data/images/photo.jpg',
        'photo.jpg',
        'image/jpeg',
        true
      )

      expect(result.status).toBe('waiting_for_item')
    })

    it('sets isOfflineItem correctly when true', () => {
      const result = addPendingImage(
        db,
        'item-1',
        'file:///data/images/photo.jpg',
        'photo.jpg',
        'image/jpeg',
        true
      )

      expect(result.isOfflineItem).toBe(true)
    })

    it('sets isOfflineItem to false by default', () => {
      const result = addPendingImage(
        db,
        'item-1',
        'file:///data/images/photo.jpg',
        'photo.jpg',
        'image/jpeg'
      )

      expect(result.isOfflineItem).toBe(false)
    })

    it('sets retryCount to 0', () => {
      const result = addPendingImage(
        db,
        'item-1',
        'file:///data/images/photo.jpg',
        'photo.jpg',
        'image/jpeg'
      )

      expect(result.retryCount).toBe(0)
    })

    it('sets createdAt to a valid ISO timestamp', () => {
      const result = addPendingImage(
        db,
        'item-1',
        'file:///data/images/photo.jpg',
        'photo.jpg',
        'image/jpeg'
      )

      expect(result.createdAt).toBeDefined()
      expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt)
    })

    it('generates unique ids for different images', () => {
      const img1 = addPendingImage(
        db,
        'item-1',
        'file:///data/images/a.jpg',
        'a.jpg',
        'image/jpeg'
      )
      const img2 = addPendingImage(
        db,
        'item-1',
        'file:///data/images/b.jpg',
        'b.jpg',
        'image/jpeg'
      )

      expect(img1.id).not.toBe(img2.id)
    })

    it('returns the full PendingImage object', () => {
      const result = addPendingImage(
        db,
        'item-1',
        'file:///data/images/photo.jpg',
        'photo.jpg',
        'image/jpeg'
      )

      expect(result).toMatchObject({
        itemId: 'item-1',
        fileUri: 'file:///data/images/photo.jpg',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        isOfflineItem: false,
        status: 'pending',
        retryCount: 0,
      })
      expect(result.id).toBeDefined()
      expect(result.createdAt).toBeDefined()
    })
  })

  // ---------------------------------------------------------------------------
  // getPendingImages
  // ---------------------------------------------------------------------------
  describe('getPendingImages', () => {
    it('returns empty array when no pending images', () => {
      expect(getPendingImages(db)).toEqual([])
    })

    it('returns all pending images', () => {
      addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg')
      addPendingImage(db, 'item-2', 'file:///b.jpg', 'b.jpg', 'image/jpeg')
      addPendingImage(db, 'item-3', 'file:///c.png', 'c.png', 'image/png')

      const result = getPendingImages(db)
      expect(result).toHaveLength(3)
    })

    it('returns images with all fields populated', () => {
      addPendingImage(db, 'item-1', 'file:///data/photo.jpg', 'photo.jpg', 'image/jpeg', true)

      const result = getPendingImages(db)
      expect(result[0]).toMatchObject({
        itemId: 'item-1',
        fileUri: 'file:///data/photo.jpg',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        isOfflineItem: true,
        status: 'waiting_for_item',
        retryCount: 0,
      })
    })
  })

  // ---------------------------------------------------------------------------
  // getPendingImageById
  // ---------------------------------------------------------------------------
  describe('getPendingImageById', () => {
    it('returns null when id does not exist', () => {
      expect(getPendingImageById(db, 'nonexistent-id')).toBeNull()
    })

    it('returns the image by id', () => {
      const created = addPendingImage(
        db,
        'item-1',
        'file:///photo.jpg',
        'photo.jpg',
        'image/jpeg'
      )

      const result = getPendingImageById(db, created.id)
      expect(result).not.toBeNull()
      expect(result!.id).toBe(created.id)
      expect(result!.itemId).toBe('item-1')
    })

    it('returns correct isOfflineItem boolean value', () => {
      const img = addPendingImage(
        db,
        'item-1',
        'file:///photo.jpg',
        'photo.jpg',
        'image/jpeg',
        true
      )

      const result = getPendingImageById(db, img.id)
      expect(result!.isOfflineItem).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // getPendingImagesForItem
  // ---------------------------------------------------------------------------
  describe('getPendingImagesForItem', () => {
    it('returns empty array when no images for item', () => {
      addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg')

      const result = getPendingImagesForItem(db, 'item-999')
      expect(result).toEqual([])
    })

    it('returns only images for the specified item', () => {
      addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg')
      addPendingImage(db, 'item-2', 'file:///b.jpg', 'b.jpg', 'image/jpeg')
      addPendingImage(db, 'item-1', 'file:///c.jpg', 'c.jpg', 'image/jpeg')

      const result = getPendingImagesForItem(db, 'item-1')
      expect(result).toHaveLength(2)
      expect(result.every((img) => img.itemId === 'item-1')).toBe(true)
    })

    it('includes images with different statuses for same item', () => {
      const img1 = addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg')
      addPendingImage(db, 'item-1', 'file:///b.jpg', 'b.jpg', 'image/jpeg', true)

      const result = getPendingImagesForItem(db, 'item-1')
      expect(result).toHaveLength(2)
      const statuses = result.map((img) => img.status)
      expect(statuses).toContain('pending')
      expect(statuses).toContain('waiting_for_item')
    })
  })

  // ---------------------------------------------------------------------------
  // getPendingImagesByStatus
  // ---------------------------------------------------------------------------
  describe('getPendingImagesByStatus', () => {
    it('returns empty array when no images with status', () => {
      addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg')

      const result = getPendingImagesByStatus(db, 'failed')
      expect(result).toEqual([])
    })

    it('returns only images with the specified status', () => {
      addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg')
      addPendingImage(db, 'item-2', 'file:///b.jpg', 'b.jpg', 'image/jpeg', true)

      const pending = getPendingImagesByStatus(db, 'pending')
      expect(pending).toHaveLength(1)
      expect(pending[0].itemId).toBe('item-1')

      const waiting = getPendingImagesByStatus(db, 'waiting_for_item')
      expect(waiting).toHaveLength(1)
      expect(waiting[0].itemId).toBe('item-2')
    })

    it('returns multiple images with same status', () => {
      const img1 = addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg')
      const img2 = addPendingImage(db, 'item-2', 'file:///b.jpg', 'b.jpg', 'image/jpeg')

      updatePendingImageStatus(db, img1.id, 'uploading')
      updatePendingImageStatus(db, img2.id, 'uploading')

      const uploading = getPendingImagesByStatus(db, 'uploading')
      expect(uploading).toHaveLength(2)
    })
  })

  // ---------------------------------------------------------------------------
  // updatePendingImageStatus
  // ---------------------------------------------------------------------------
  describe('updatePendingImageStatus', () => {
    it('updates the status field', () => {
      const img = addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg')

      updatePendingImageStatus(db, img.id, 'uploading')

      const result = getPendingImageById(db, img.id)
      expect(result!.status).toBe('uploading')
    })

    it('stores the error message when provided', () => {
      const img = addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg')

      updatePendingImageStatus(db, img.id, 'failed', 'Upload timeout')

      const result = getPendingImageById(db, img.id)
      expect(result!.lastError).toBe('Upload timeout')
    })

    it('increments retryCount when status is failed', () => {
      const img = addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg')

      updatePendingImageStatus(db, img.id, 'failed', 'Error 1')
      expect(getPendingImageById(db, img.id)!.retryCount).toBe(1)

      updatePendingImageStatus(db, img.id, 'failed', 'Error 2')
      expect(getPendingImageById(db, img.id)!.retryCount).toBe(2)

      updatePendingImageStatus(db, img.id, 'failed', 'Error 3')
      expect(getPendingImageById(db, img.id)!.retryCount).toBe(3)
    })

    it('does not increment retryCount for non-failed status', () => {
      const img = addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg')

      updatePendingImageStatus(db, img.id, 'uploading')
      expect(getPendingImageById(db, img.id)!.retryCount).toBe(0)
    })

    it('clears lastError when no error provided on non-failed status', () => {
      const img = addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg')

      updatePendingImageStatus(db, img.id, 'failed', 'Some error')
      updatePendingImageStatus(db, img.id, 'pending')

      const result = getPendingImageById(db, img.id)
      expect(result!.lastError).toBeUndefined()
    })

    it('is a no-op for non-existent id', () => {
      updatePendingImageStatus(db, 'nonexistent-id', 'failed', 'Error')
      expect(getPendingImageCount(db)).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // transitionWaitingImagesToReady
  // ---------------------------------------------------------------------------
  describe('transitionWaitingImagesToReady', () => {
    it('changes waiting_for_item images to pending for the specified item', () => {
      addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg', true)
      addPendingImage(db, 'item-1', 'file:///b.jpg', 'b.jpg', 'image/jpeg', true)

      transitionWaitingImagesToReady(db, 'item-1')

      const images = getPendingImagesForItem(db, 'item-1')
      expect(images).toHaveLength(2)
      expect(images.every((img) => img.status === 'pending')).toBe(true)
    })

    it('sets isOfflineItem to false after transition', () => {
      addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg', true)

      transitionWaitingImagesToReady(db, 'item-1')

      const images = getPendingImagesForItem(db, 'item-1')
      expect(images[0].isOfflineItem).toBe(false)
    })

    it('does not affect images that are not waiting_for_item', () => {
      const pendingImg = addPendingImage(
        db,
        'item-1',
        'file:///a.jpg',
        'a.jpg',
        'image/jpeg',
        false
      )
      const failedImg = addPendingImage(
        db,
        'item-1',
        'file:///b.jpg',
        'b.jpg',
        'image/jpeg',
        false
      )
      updatePendingImageStatus(db, failedImg.id, 'failed', 'Error')

      transitionWaitingImagesToReady(db, 'item-1')

      const afterPending = getPendingImageById(db, pendingImg.id)
      expect(afterPending!.status).toBe('pending')

      const afterFailed = getPendingImageById(db, failedImg.id)
      expect(afterFailed!.status).toBe('failed')
    })

    it('does not affect waiting images for other items', () => {
      addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg', true)
      addPendingImage(db, 'item-2', 'file:///b.jpg', 'b.jpg', 'image/jpeg', true)

      transitionWaitingImagesToReady(db, 'item-1')

      const item2Images = getPendingImagesForItem(db, 'item-2')
      expect(item2Images[0].status).toBe('waiting_for_item')
      expect(item2Images[0].isOfflineItem).toBe(true)
    })

    it('is a no-op when no waiting images for item', () => {
      addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg', false)

      transitionWaitingImagesToReady(db, 'item-1')

      const images = getPendingImagesForItem(db, 'item-1')
      expect(images[0].status).toBe('pending')
    })

    it('is a no-op when item has no images', () => {
      transitionWaitingImagesToReady(db, 'item-999')
      expect(getPendingImageCount(db)).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // removePendingImage
  // ---------------------------------------------------------------------------
  describe('removePendingImage', () => {
    it('removes the image by id', () => {
      const img = addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg')

      removePendingImage(db, img.id)
      expect(getPendingImages(db)).toEqual([])
    })

    it('only removes the specified image', () => {
      const img1 = addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg')
      const img2 = addPendingImage(db, 'item-1', 'file:///b.jpg', 'b.jpg', 'image/jpeg')

      removePendingImage(db, img1.id)

      const remaining = getPendingImages(db)
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(img2.id)
    })

    it('is a no-op for non-existent id', () => {
      addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg')
      removePendingImage(db, 'nonexistent-id')
      expect(getPendingImageCount(db)).toBe(1)
    })
  })

  // ---------------------------------------------------------------------------
  // getPendingImageCount
  // ---------------------------------------------------------------------------
  describe('getPendingImageCount', () => {
    it('returns 0 when no pending images', () => {
      expect(getPendingImageCount(db)).toBe(0)
    })

    it('returns correct count', () => {
      addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg')
      addPendingImage(db, 'item-2', 'file:///b.jpg', 'b.jpg', 'image/jpeg')
      addPendingImage(db, 'item-3', 'file:///c.jpg', 'c.jpg', 'image/jpeg', true)

      expect(getPendingImageCount(db)).toBe(3)
    })

    it('reflects removals', () => {
      const img = addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg')
      addPendingImage(db, 'item-2', 'file:///b.jpg', 'b.jpg', 'image/jpeg')

      removePendingImage(db, img.id)
      expect(getPendingImageCount(db)).toBe(1)
    })

    it('counts all statuses', () => {
      addPendingImage(db, 'item-1', 'file:///a.jpg', 'a.jpg', 'image/jpeg')
      addPendingImage(db, 'item-2', 'file:///b.jpg', 'b.jpg', 'image/jpeg', true)
      const img3 = addPendingImage(db, 'item-3', 'file:///c.jpg', 'c.jpg', 'image/jpeg')
      updatePendingImageStatus(db, img3.id, 'failed', 'Error')

      expect(getPendingImageCount(db)).toBe(3)
    })
  })
})
