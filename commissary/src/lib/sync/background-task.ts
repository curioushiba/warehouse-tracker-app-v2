/**
 * Background sync is NOT YET IMPLEMENTED.
 *
 * Background tasks (expo-background-fetch / expo-task-manager) run outside the
 * React tree, so they cannot access the SQLiteProvider context needed by the
 * sync engine. A future implementation will open a standalone SQLite connection.
 *
 * All actual sync happens in the foreground via useSyncQueue when the app
 * regains focus.
 */
