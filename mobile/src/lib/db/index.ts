// Database migrations
export { runMigrations } from './migrations'

// Transaction queue
export {
  addToQueue,
  getQueuedTransactions,
  getQueueCount,
  removeFromQueue,
  incrementRetryCount,
  clearQueue,
  getTransactionsByDomain,
} from './transaction-queue'

// Items cache
export {
  cacheItems,
  getCachedItem,
  getCachedItemBySku,
  getCachedItemByBarcode,
  getAllCachedItems,
  clearItemsCache,
  updateCachedItem,
  searchCachedItems,
} from './items-cache'

// Metadata
export {
  setMetadata,
  getMetadata,
  getLastSyncTime,
  setLastSyncTime,
  getDeviceId,
} from './metadata'

// Item edit queue
export {
  addItemEditToQueue,
  getQueuedItemEdits,
  getQueuedItemEditsByItem,
  getQueuedItemEditsByStatus,
  getItemEditQueueCount,
  updateItemEditStatus,
  removeItemEditFromQueue,
  clearItemEditQueue,
} from './item-edit-queue'

// Item create queue
export {
  addItemCreateToQueue,
  getQueuedItemCreates,
  getQueuedItemCreateById,
  getQueuedItemCreatesByStatus,
  getItemCreateQueueCount,
  updateItemCreateStatus,
  updateItemCreateData,
  removeItemCreateFromQueue,
  clearItemCreateQueue,
} from './item-create-queue'

// Item archive queue
export {
  addItemArchiveToQueue,
  getQueuedItemArchives,
  getQueuedArchivesByItem,
  getQueuedArchivesByStatus,
  getItemArchiveQueueCount,
  updateItemArchiveStatus,
  removeItemArchiveFromQueue,
  clearItemArchiveQueue,
} from './item-archive-queue'

// Pending images
export {
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

// Categories cache
export {
  cacheCategories,
  getAllCachedCategories,
  clearCategoriesCache,
} from './categories-cache'

// Backup
export { exportQueues, importQueues } from './backup'

// Conversions
export {
  cachedItemToItem,
  itemToCachedItem,
  cachedCategoryToCategory,
  categoryToCachedCategory,
} from './conversions'

// Apply pending operations
export { applyPendingOperationsToItems } from './apply-pending-ops'

// Queue counts
export { getAllQueueCounts } from './queue-counts'
export type { QueueCounts } from './queue-counts'
