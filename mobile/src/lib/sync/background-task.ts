import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

export const BACKGROUND_SYNC_TASK = 'packtrack-background-sync';

/**
 * Define the background sync task. Call once at app startup (root _layout.tsx).
 *
 * Note: Background tasks cannot easily access the SQLite context that is
 * scoped to the React tree. This placeholder returns NoData. Real sync
 * happens in the foreground via useSyncQueue when the app regains focus.
 */
export function registerBackgroundSync(): void {
  TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    // Background tasks run outside the React tree so we cannot access
    // the SQLiteProvider context here. Foreground sync via useSyncQueue
    // handles the actual queue processing when the app is active.
    return BackgroundFetch.BackgroundFetchResult.NoData;
  });
}

/**
 * Register the background fetch interval with the OS.
 * Should be called after registerBackgroundSync().
 */
export async function configureBackgroundSync(): Promise<void> {
  await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
    minimumInterval: 15 * 60, // 15 minutes
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
