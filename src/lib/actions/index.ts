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
  getItemByCode,
  getRecentItems,
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
  getEmployeeTransactionsWithItems,
  submitTransaction,
  getRecentTransactions,
  type TransactionFilters,
  type TransactionInput,
  type EmployeeTransactionWithItem,
  type GetEmployeeTransactionsOptions,
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
  getDashboardData,
  getRecentActivity,
  getLowStockDetails,
  getCriticalStockDetails,
  getTotalItemsBreakdown,
  getTodayTransactionsBreakdown,
  type DashboardStats,
  type DashboardData,
  type PriorityLevel,
  type LowStockDetailItem,
  type LowStockDetails,
  type CriticalStockItem,
  type CriticalStockDetails,
  type CategoryBreakdown,
  type TotalItemsBreakdown,
  type TransactionTypeBreakdown,
  type TopActiveItem,
  type EmployeeActivity,
  type TodayTransactionsBreakdown,
} from './dashboard'

// Sync Errors Actions
export {
  getSyncErrors,
  getSyncErrorById,
  retrySyncError,
  dismissSyncError,
  updateSyncError,
  getPendingSyncErrorCount,
  getUserPendingSyncErrorCount,
  getUserSyncErrors,
  type SyncErrorFilters,
} from './sync-errors'
