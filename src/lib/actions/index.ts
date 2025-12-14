// Auth Actions
export {
  signIn,
  signInEmployee,
  signUp,
  signOut,
  getCurrentUser,
  updateLastLogin,
  requestPasswordReset,
  updatePassword,
  type ActionResult,
} from './auth'

// Items Actions
export {
  getItems,
  getItemById,
  getItemBySku,
  getItemByBarcode,
  createItem,
  updateItem,
  archiveItem,
  restoreItem,
  getLowStockItems,
  searchItems,
  type ItemFilters,
} from './items'

// Categories Actions
export {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryItemCount,
} from './categories'

// Locations Actions
export {
  getLocations,
  getLocationById,
  getLocationByCode,
  createLocation,
  updateLocation,
  deactivateLocation,
  activateLocation,
} from './locations'

// Transactions Actions
export {
  getTransactions,
  getTransactionById,
  getItemTransactions,
  getUserTransactions,
  submitTransaction,
  getRecentTransactions,
  type TransactionFilters,
  type TransactionInput,
} from './transactions'

// Users Actions
export {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  updateUserRole,
  resetUserPassword,
  deleteUser,
  type CreateUserInput,
} from './users'

// Alerts Actions
export {
  getAlerts,
  markAlertRead,
  markAllAlertsRead,
  deleteAlert,
  createAlert,
  getUnreadAlertCount,
} from './alerts'

// Dashboard Actions
export {
  getDashboardStats,
  getDashboardData,
  getRecentActivity,
  type DashboardStats,
  type DashboardData,
} from './dashboard'

// Sync Errors Actions
export {
  getSyncErrors,
  getSyncErrorById,
  retrySyncError,
  dismissSyncError,
  updateSyncError,
  getPendingSyncErrorCount,
  type SyncErrorFilters,
} from './sync-errors'
