# React Native Migration - Refined Specification

> Generated from interview on 2026-02-18. Supplements `docs/react-native-migration-plan.md`.

---

## 1. Decisions Made

### Architecture & Scope

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SQLite scope | All 8 queues (full port) | Future-proofs for potential admin mobile features. Port transaction_queue, items_cache, categories_cache, metadata, item_edit_queue, item_create_queue, item_archive_queue, pending_images |
| API security | Anon key + RLS (no proxy) | Supabase RLS enforces permissions at the database level. Standard pattern for mobile Supabase apps. No API proxy needed |
| Target platform | Android-only | Skip iOS-specific concerns (KeyboardAvoidingView quirks, Safe Area on notched iPhones). Build/test Android APK only. Do NOT write `Platform.select()` for iOS |
| Biometric auth | Not included | Supabase session persists across app restarts. Users rarely see login unless session expires. Keep v1 simple |
| Analytics | None in v1 | Ship without Sentry, PostHog, or any analytics. Add in a future version if needed |
| Timeline | Flexible / no fixed dates | Remove week-based timeline. Keep phase milestones as goals but don't commit to dates. Work iteratively |

### Domain Switching

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Queue on domain switch | **Persist queue, sync cross-domain** | Don't clear queue when switching domains. Each queued transaction stores its `domain` field. Sync engine reads `transaction.domain` and calls the correct RPC regardless of active domain. Zero data loss |
| Domain picker frequency | First launch + long-press header shortcut | Domain remembered in MMKV. Picker shown only on first launch or explicit switch from Profile. **New:** Long-press the domain letter in the header to trigger domain switch without navigating to Profile |
| Cache on domain switch | Clear items_cache + categories_cache only | Transaction queue is preserved. Items cache is domain-specific and must be re-fetched. Categories cache may differ by domain |

### Offline & Sync

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Background sync | Best-effort via expo-background-fetch | User wants critical background sync but also wants managed Expo workflow. Compromise: use expo-background-fetch (best-effort, ~15 min minimum interval on Android). Primary sync remains foreground (on reconnect + periodic 30s) |
| Cache refresh strategy | Auto-refresh + pull-to-refresh | Refresh items cache when app comes to foreground IF >5 minutes since last fetch. Also support manual pull-to-refresh on Home and Scan screens |
| Cache refresh UX | Silent refresh (no loading indicator) | No spinner or skeleton during background refresh. Data updates in place. Minor risk of brief flash if items change while user is looking |
| Cold start cache | Fetch on login with progress screen | Immediately after login + domain selection, fetch and cache all items for the selected domain. Show "Preparing your workspace..." loading screen. Scan screen blocked until cache is ready |

### UI/UX Interactions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Camera during scan | Camera stays active always | Mini-list overlays bottom of camera view. Camera never pauses. Fast workflow for rapid scanning in warehouse environment |
| History pagination | Infinite scroll always | Load 20 items at a time. `onEndReached` fetches next page. Same behavior whether filters are active or not |
| Partial batch failure | Retry failed items in-place | Failed items stay in batch review with visual error indicator (ring-2 ring-error). "Retry Failed" button re-attempts only failed items. No need to re-scan |
| Unknown barcode | Error + suggest manual entry | Show toast: "Barcode not found. Try searching by name?" with a button/prompt to switch to Manual mode |
| Session expiry | Immediate redirect to login | On auth error (deactivated account, expired session), clear session, redirect to login. Pending queue preserved in SQLite. On next login, queue resumes syncing |
| Quantity controls | Light haptic + 300ms debounce | Light haptic feedback on each +/- tap. Debounce state update by 300ms to prevent excessive re-renders on rapid tapping |
| First-time offline | Show login, fail on submit | Show login form normally. On submit with no connectivity, display error: "No internet connection. Please connect to sign in." |

### Audio & Feedback

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scan success | Audio chime + haptic | Play scan-success.mp3 + medium haptic impact on successful barcode scan |
| Scan error | Error sound + haptic pattern | Play distinct error sound (scan-error.mp3) + warning haptic notification for unknown barcodes or stock-exceeded |
| Required sound assets | `scan-success.mp3` + `scan-error.mp3` | Two audio files in `assets/sounds/` |

### Dark Mode

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Dark mode behavior | System default + in-app override | Default to Android system setting. In-app toggle overrides system preference. Three states: "System", "Light", "Dark" |
| Persistence | MMKV key `packtrack.colorScheme` | Store user preference. On app launch, check MMKV first; if "system", follow `Appearance.getColorScheme()` |
| Profile UI | Replace Switch with 3-option selector | Instead of a boolean dark mode toggle, show a segmented control or select with "System / Light / Dark" options |

### Image Caching

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Image strategy | Cache URLs + lazy disk cache | Store `image_url` in SQLite items_cache. When an image is displayed, cache it to local filesystem via `expo-file-system`. Frequently-viewed images become available offline over time |
| Cache location | `FileSystem.cacheDirectory + '/images/'` | Use cache directory (OS can reclaim space). Not documents directory |
| Cache key | MD5 hash of image URL | Deterministic filename for each image URL |

### Distribution

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Initial distribution | Sideload APK directly | Build APK via EAS, share via company file share/drive. Employees enable "Install from unknown sources". Manual updates |
| Future distribution | Google Play Store | After sideload proves stable, publish to Play Store for auto-updates. Internal testing track first, then production |
| EAS build profiles | `development`, `preview`, `production` | Development for dev testing, preview for sideload APK, production for Play Store |

---

## 2. Technical Approach Updates

### Changes to Migration Plan

These items modify or supplement the original `react-native-migration-plan.md`:

#### Domain Switch Queue Behavior (Section 3)

**Original:** "Clear domain-specific caches when switching" (clears queue).

**Revised:** When switching domains:
1. Clear `items_cache` and `categories_cache` (domain-specific data)
2. **Do NOT clear `transaction_queue`** - transactions have their own `domain` field
3. Sync engine always reads `transaction.domain` per-row and calls the correct RPC
4. After domain switch, fetch and cache items for the new domain (show "Preparing..." screen)

```typescript
const setDomain = useCallback(async (newDomain: Domain) => {
  if (newDomain === domain) return;

  // Clear domain-specific caches ONLY (not the transaction queue!)
  await Promise.all([
    clearItemsCache(),
    clearCategoriesCache(),
  ]);

  storage.set(STORAGE_KEY, newDomain);
  setDomainState(newDomain);
}, [domain]);
```

#### Long-Press Header Domain Switch (Section 3)

**New addition:** Add `onLongPress` handler to the domain letter/icon in the MobileHeader component. On long-press, show a confirmation dialog or navigate directly to domain picker.

```typescript
// In MobileHeader.tsx
<Pressable
  onLongPress={() => {
    router.push('/domain-picker');
  }}
  delayLongPress={500}
>
  <View className="w-8 h-8 rounded-full items-center justify-center"
        style={{ backgroundColor: brandColor }}>
    <Text className="text-white font-bold">{headerLetter}</Text>
  </View>
</Pressable>
```

#### Dark Mode Three-State (Section 9 - Profile Screen)

**Original:** Boolean dark mode toggle (Switch component).

**Revised:** Three-option selector for color scheme:

```typescript
type ColorSchemePreference = 'system' | 'light' | 'dark';

// In SettingsContext
const [colorScheme, setColorScheme] = useState<ColorSchemePreference>('system');

// On mount, load from MMKV
useEffect(() => {
  const stored = storage.getString('packtrack.colorScheme') as ColorSchemePreference;
  if (stored) setColorScheme(stored);
}, []);

// Resolve effective scheme
const effectiveScheme = colorScheme === 'system'
  ? Appearance.getColorScheme() ?? 'light'
  : colorScheme;
```

#### Cache Refresh on Foreground (New)

**New addition:** Add `AppState` listener to refresh items cache when app comes to foreground:

```typescript
// In a useItemsCacheRefresh hook
useEffect(() => {
  const subscription = AppState.addEventListener('change', async (state) => {
    if (state === 'active' && isAuthenticated && domain) {
      const lastRefresh = storage.getNumber('packtrack.lastCacheRefresh') ?? 0;
      const fiveMinutes = 5 * 60 * 1000;
      if (Date.now() - lastRefresh > fiveMinutes) {
        await refreshItemsCache(domain);
        storage.set('packtrack.lastCacheRefresh', Date.now());
      }
    }
  });
  return () => subscription.remove();
}, [isAuthenticated, domain]);
```

#### Cold Start Cache Fetch (Section 2 - Auth Flow)

**Updated auth flow:**

```
Login Success
  ├── Store session in MMKV
  ├── Fetch profile from Supabase
  ├── Check MMKV for selected domain
  │   ├── Domain set → Show "Preparing your workspace..." → Fetch & cache items → Navigate to (app)/(tabs)/
  │   └── No domain → Navigate to domain-picker
  │
Domain Selected
  ├── Store domain in MMKV
  ├── Show "Preparing your workspace..." loading screen
  ├── Fetch and cache all items for domain
  ├── Fetch and cache categories
  ├── Navigate to (app)/(tabs)/
```

#### Scan Error Sound (Section 9 - Scan Screen)

**New addition:** Add `scan-error.mp3` to `assets/sounds/`. Update `useScanFeedback` hook:

```typescript
export function useScanFeedback() {
  const successSound = useRef<Audio.Sound>();
  const errorSound = useRef<Audio.Sound>();

  useEffect(() => {
    Audio.Sound.createAsync(require('@/assets/sounds/scan-success.mp3'))
      .then(({ sound }) => { successSound.current = sound; });
    Audio.Sound.createAsync(require('@/assets/sounds/scan-error.mp3'))
      .then(({ sound }) => { errorSound.current = sound; });

    return () => {
      successSound.current?.unloadAsync();
      errorSound.current?.unloadAsync();
    };
  }, []);

  const playSuccess = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await successSound.current?.replayAsync();
  }, []);

  const playError = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await errorSound.current?.replayAsync();
  }, []);

  return { playSuccess, playError };
}
```

#### Partial Failure Retry (Section 9 - Batch Review)

**Updated behavior:** After partial failure, add a "Retry Failed" button that only re-attempts failed items:

```typescript
const handleRetryFailed = async () => {
  const failedBatchItems = batchItems.filter(item => failedItems.includes(item.itemId));
  // Re-run submission logic only for failed items
  // Same flow as handleConfirmSubmit but filtered to failedItems
};
```

#### Lazy Image Cache (New)

**New addition:** Image caching utility:

```typescript
// lib/images/cache.ts
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

const IMAGE_CACHE_DIR = FileSystem.cacheDirectory + 'images/';

export async function getCachedImageUri(remoteUrl: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.MD5,
    remoteUrl
  );
  const localUri = IMAGE_CACHE_DIR + hash;

  const info = await FileSystem.getInfoAsync(localUri);
  if (info.exists) return localUri;

  // Download and cache
  await FileSystem.makeDirectoryAsync(IMAGE_CACHE_DIR, { intermediates: true });
  await FileSystem.downloadAsync(remoteUrl, localUri);
  return localUri;
}
```

#### Quantity Control Debounce (Section 9 - Batch Review)

**Updated implementation:**

```typescript
const handleQuantityChange = useMemo(() => {
  const debounced = new Map<string, NodeJS.Timeout>();
  return (itemId: string, quantity: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const existing = debounced.get(itemId);
    if (existing) clearTimeout(existing);
    debounced.set(itemId, setTimeout(() => {
      updateQuantity(itemId, quantity);
      setSubmitError(null);
      setFailedItems([]);
      debounced.delete(itemId);
    }, 300));
  };
}, [updateQuantity]);
```

---

## 3. UI/UX Specification

### States for Every Screen

| Screen | Loading | Empty | Error | Offline | Success |
|--------|---------|-------|-------|---------|---------|
| Login | Button spinner on submit | N/A | Red error text below form | "No internet connection" error on submit | Redirect to domain-picker or home |
| Domain Picker | "Preparing your workspace..." after selection | N/A | "Failed to load items. Retry?" | Block (requires first-time online) | Redirect to home |
| Home | Skeleton cards while data loads | "No recent activity" placeholder | Toast on fetch error | Offline banner at top, data from cache | Normal state |
| Scan (Camera) | N/A (camera starts immediately) | N/A | "Barcode not found. Try searching by name?" toast | Offline banner, scans use local cache | Success overlay + haptic + sound |
| Scan (Manual) | Spinner in search input | "No items found" in search results | Toast on search error | Search uses local cache | Item added to batch, mini-list updates |
| Batch Review | Progress bar during submission | "No items in batch" with back button | Red ring on failed items + error alert | Offline banner + "will be queued" warning | Redirect to home with success toast |
| History | Skeleton list rows | "No transactions yet" placeholder | "Failed to load history. Pull to refresh." | Shows cached transactions only | Normal list with items |
| Profile | N/A (all data local/cached) | N/A | N/A | Offline indicator in sync status | Normal state |

### Interaction Patterns

- **Tap feedback:** All `Pressable` components use `opacity: 0.7` on press
- **Haptic feedback:** Light impact on quantity +/-, medium impact on scan success, warning notification on scan error, success notification on batch submit
- **Pull-to-refresh:** Home screen (refreshes recent activity + stats), Scan manual mode (refreshes recent items), History (refreshes transactions)
- **Swipe gestures:** None in v1 (no swipe-to-delete, no drawer navigation)
- **Keyboard:** Auto-dismiss on scroll, `KeyboardAvoidingView` on Login only (Android handles this better than iOS)

---

## 4. Edge Cases

| Edge Case | Handling |
|-----------|----------|
| User scans same barcode twice in batch | Duplicate detection modal: "This item is already in your batch. Add another?" Yes increments quantity, No cancels |
| User submits check-out with quantity > stock | "Submit All" button disabled. Red alert: "Some items exceed available stock. Please adjust quantities." Per-item stock warning on BatchItemRow |
| Items cache empty (first login) | Block scan screen. Show "Preparing your workspace..." with loading indicator until cache is populated |
| Items cache fetch fails | Show error: "Failed to load items. Check connection and try again." with retry button. User cannot proceed to scan |
| Session refresh fails (account deactivated) | Immediate redirect to login screen. Queue preserved in SQLite. Error: "Your session has expired. Please log in again." |
| Domain switch with pending queue | Queue is preserved. Caches cleared and refetched for new domain. Sync engine processes old-domain transactions using their stored domain field |
| App killed mid-sync | On relaunch, queue count restored from SQLite. `syncInProgressRef` resets. Sync resumes on next trigger (foreground periodic or reconnect) |
| Max retries (3) exceeded | Transaction moved to `sync_errors` table via Supabase insert. Removed from local queue. Failed sync count incremented in header badge |
| Network drop mid-batch-submit | Current item fails. Remaining items not attempted. Failed items highlighted in batch review. User can retry |
| Very large items cache (1000+ items) | SQLite handles this efficiently. Items fetched in paginated batches during initial cache. Search uses SQL `LIKE` on local cache |

---

## 5. Offline Capabilities - Deep Dive

> Decisions from focused offline interview (2026-02-18, Round 2).

### Stock Consistency & Optimistic UI

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Phantom stock (stale cache + check-out) | **Block check-out if cache >30 min stale** | If user is online and cache is >30 min old, force a refresh before allowing check-out. 10-second timeout on refresh; if timeout, show warning "Could not refresh stock data" but allow the check-out anyway. If offline, allow with no block (can't refresh) |
| Optimistic UI merging | **Full optimistic merge (match web)** | Port `applyPendingOperationsToItems()`. Queued check-ins/outs adjust stock numbers locally. Queued item creates appear in items list. Queued archives hide items. Matches web PWA behavior exactly |

### Stale Cache Check-Out Flow

```
User taps "Submit All" on Batch Review (check-out)
  ├── Is online?
  │   ├── YES → Is items cache >30 min old?
  │   │   ├── YES → Attempt cache refresh (10s timeout)
  │   │   │   ├── Refresh SUCCESS → Re-validate stock levels → Proceed or show stock exceeded error
  │   │   │   └── Refresh TIMEOUT → Show warning "Could not refresh stock data" → Allow submission
  │   │   └── NO → Proceed normally
  │   └── NO → Proceed (transactions will be queued offline)
```

### Queue & Sync Behavior

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Cross-domain sync ordering | **Strict FIFO** | Process one transaction at a time in `createdAt` order, regardless of domain. A slow FG transaction blocks CM transactions behind it. Simple and predictable |
| Retry timing | **Flat 30s (match web)** | Every 30 seconds, attempt to sync all queued items. No exponential backoff. Each item's `retryCount` increments on failure. 3 max retries then sync_error |
| Per-transaction timeout | **60 seconds** | Each Supabase RPC call times out after 60s. Accommodates slow 2G connections in remote warehouses. On timeout, treat as failure (increment retry) |
| Double failure (sync_error insert fails) | **Remove from queue regardless** | After max retries, remove transaction from queue even if the `sync_errors` Supabase insert fails. Accept the rare edge case of lost data rather than leaving zombie transactions |
| Manual sync trigger | **Sync button + pull-to-refresh** | Pull-to-refresh on Home triggers both data refresh AND sync queue processing. Dedicated "Sync Now" button on Profile screen. Maximum user control |

### Network Detection

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Connectivity detection | **Reachability + Supabase ping** | Use NetInfo's `isInternetReachable` for basic check, plus periodic lightweight Supabase query to verify actual API connectivity. Handles captive portals and firewalled WiFi |

```typescript
// hooks/useOnlineStatus.ts - Enhanced for RN
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '@/lib/supabase/client';

const PING_INTERVAL = 60000; // 1 minute
const PING_TIMEOUT = 5000;   // 5 seconds

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  // NetInfo listener for quick detection
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const reachable = state.isConnected && state.isInternetReachable !== false;
      setIsOnline(prev => {
        if (prev && !reachable) setWasOffline(true);
        return reachable;
      });
    });
    return () => unsubscribe();
  }, []);

  // Periodic Supabase ping for API-level verification
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT);
        const { error } = await supabase.from('profiles').select('id').limit(1).abortSignal(controller.signal);
        clearTimeout(timeout);
        if (error) throw error;
        setIsOnline(true);
      } catch {
        setIsOnline(prev => {
          if (prev) setWasOffline(true);
          return false;
        });
      }
    }, PING_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const clearWasOffline = useCallback(() => setWasOffline(false), []);
  return { isOnline, wasOffline, clearWasOffline };
}
```

### Multi-Device Conflicts

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Cross-device stock conflicts | **Trust server-side validation only** | Let Supabase RPC reject transactions with insufficient stock. Failed ones become sync_errors. No Realtime subscription. No pre-submit refresh (separate from stale-cache block). Admin resolves conflicts from desktop dashboard |

### Sync Error UX

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Failed syncs display | **Dedicated sync errors screen** | New screen (not in original plan) listing each failed transaction: item name, transaction type, error message, timestamp. Tappable from the failed sync badge in the header. Employee can see what failed. **No retry button** - admin handles resolution from desktop |

#### Sync Errors Screen Design

```
Route: (app)/sync-errors.tsx (stack screen, no tabs)

Layout:
  ┌─────────────────────────────┐
  │ ← Sync Errors        3 total│
  ├─────────────────────────────┤
  │ These transactions failed    │
  │ after 3 attempts. Your admin │
  │ can review them.             │
  ├─────────────────────────────┤
  │ ┌───────────────────────────┐│
  │ │ ✗ Chicken Breast (5 kg)   ││
  │ │   Check Out · 2 hours ago ││
  │ │   Error: Insufficient stock││
  │ └───────────────────────────┘│
  │ ┌───────────────────────────┐│
  │ │ ✗ Cooking Oil (3 bottles) ││
  │ │   Check In · 3 hours ago  ││
  │ │   Error: Item not found   ││
  │ └───────────────────────────┘│
  └─────────────────────────────┘
```

### Offline Warning Threshold

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Warning trigger | **50 transactions OR 24 hours offline** | Whichever comes first |
| Warning display | **Persistent banner on all screens** | Yellow banner below header on every screen: "You have many pending transactions. Connect to sync when possible." Dismissible but returns on next screen navigation |

### Sync Status Display (Home Screen)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Queue display detail | **Count + per-item breakdown** | "5 pending: 3 check-ins, 2 check-outs" with tappable detail showing individual item names. Warehouse workers need to know exactly what's queued |

#### Home Screen Sync Card Design

```
┌─────────────────────────────────┐
│ ⟳ 5 Pending Transactions        │
│   3 check-ins · 2 check-outs    │
│                                  │
│   ▸ Chicken Breast ×2 (IN)      │
│   ▸ Cooking Oil ×1 (IN)         │
│   ▸ Paper Towels ×1 (OUT)       │
│   ▸ Bleach ×1 (OUT)             │
│                                  │
│ Last sync: 5 min ago             │
│                    [Sync Now]    │
└─────────────────────────────────┘
```

### Cache Management

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Cache refresh strategy | **Full on first load, incremental after** | First fetch downloads all items for the domain. Subsequent foreground refreshes (>5 min) use `updated_at > lastSync`. Full refresh on pull-to-refresh |
| Handling server deletions | **Periodic full refresh** | Every 10th incremental refresh (or once per day, whichever comes first), do a full refresh instead of incremental. Catches hard deletes and ensures consistency |
| Archived items in cache | **Keep until queue clear** | When a server refresh shows an item as archived, mark `is_archived=true` in local cache but don't delete. Queued transactions can still reference it for display. Remove only after all referencing transactions are synced |

#### Incremental Refresh Flow

```
App comes to foreground
  ├── Is items cache >5 min old?
  │   └── YES → Check: is this the 10th refresh OR >24 hours since last full?
  │       ├── YES → Full refresh (delete all + re-insert)
  │       └── NO → Incremental refresh
  │           ├── Fetch items WHERE updated_at > lastSync
  │           ├── UPSERT into items_cache
  │           ├── For archived items: check if any queue entries reference them
  │           │   ├── YES → Keep with is_archived=true
  │           │   └── NO → Delete from cache
  │           └── Update metadata.lastCacheRefresh
  └── NO → Skip
```

### SQLite Database Management

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Schema migrations | **expo-sqlite built-in migrations** | Use expo-sqlite's migration support for version tracking and running SQL scripts. Matches the library's recommended pattern |
| Corruption recovery | **Backup + recreate** | Periodically export queue tables to JSON backup. On corruption, recreate DB and restore from backup |
| Backup timing | **On app background + after batch submit** | Backup triggers: (1) AppState changes to 'background', (2) after a batch submission completes. Minimal I/O, covers critical paths. Designed for low-end Android phones with slow eMMC storage |
| Backup storage | **Single JSON file in documentDirectory** | `FileSystem.documentDirectory + 'queue-backup.json'`. Overwrite on each backup (no accumulation). Survives cache clears |
| Backup scope | **Queue tables only** | Back up: transaction_queue, item_edit_queue, item_create_queue, item_archive_queue, pending_images. Don't back up items_cache or categories_cache (re-fetchable from server) |

#### Backup Implementation

```typescript
// lib/offline/backup.ts
import * as FileSystem from 'expo-file-system';

const BACKUP_PATH = FileSystem.documentDirectory + 'queue-backup.json';

interface QueueBackup {
  version: number;
  timestamp: string;
  transactionQueue: QueuedTransaction[];
  itemEditQueue: QueuedItemEdit[];
  itemCreateQueue: QueuedItemCreate[];
  itemArchiveQueue: QueuedItemArchive[];
  pendingImages: Omit<PendingImage, 'filePath'>[]; // file paths stored separately
}

export async function createBackup(db: SQLiteDatabase): Promise<void> {
  const backup: QueueBackup = {
    version: 1,
    timestamp: new Date().toISOString(),
    transactionQueue: await getQueuedTransactions(),
    itemEditQueue: await getQueuedItemEdits(),
    itemCreateQueue: await getQueuedItemCreates(),
    itemArchiveQueue: await getQueuedItemArchives(),
    pendingImages: await getPendingImages(),
  };
  await FileSystem.writeAsStringAsync(BACKUP_PATH, JSON.stringify(backup));
}

export async function restoreFromBackup(db: SQLiteDatabase): Promise<boolean> {
  try {
    const content = await FileSystem.readAsStringAsync(BACKUP_PATH);
    const backup: QueueBackup = JSON.parse(content);
    // Re-insert all queued items into fresh tables
    for (const tx of backup.transactionQueue) await addToQueue(tx);
    for (const edit of backup.itemEditQueue) await restoreItemEdit(edit);
    // ... etc for each queue
    return true;
  } catch {
    return false; // No backup or corrupted backup
  }
}
```

### Logout Cleanup

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data preserved on logout | **Preserve cache, clear queues** | Keep `items_cache` and `categories_cache` (useful if same user logs back in quickly). Clear all queue tables (transaction, edit, create, archive, pending_images). Clear MMKV session. Keep domain preference + color scheme |

#### Logout Cleanup Flow

```
User confirms logout
  ├── Sign out via Supabase (clears session)
  ├── Clear SQLite queue tables:
  │   ├── transaction_queue → DELETE ALL
  │   ├── item_edit_queue → DELETE ALL
  │   ├── item_create_queue → DELETE ALL
  │   ├── item_archive_queue → DELETE ALL
  │   └── pending_images → DELETE ALL + delete image files from disk
  ├── KEEP SQLite caches:
  │   ├── items_cache (preserved)
  │   ├── categories_cache (preserved)
  │   └── metadata (preserved)
  ├── Clear MMKV session keys
  ├── KEEP MMKV preferences:
  │   ├── packtrack.activeDomain (preserved)
  │   ├── packtrack.colorScheme (preserved)
  │   └── packtrack.lastCacheRefresh (preserved)
  ├── Delete backup file (queue data no longer valid)
  └── Navigate to login screen
```

---

## 6. Gap Analysis Decisions (Round 3)

> Decisions from gap analysis interview (2026-02-18, Round 3). Covers areas missed by the original plan and first two interview rounds.

### Operational Concerns

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Crash reporting | **None in v1** | Accept blind spots. Workers report bugs verbally. Revisit after initial deployment proves stability needs |
| App updates | **expo-updates (OTA)** | JS bundle updates pushed without new APK install. Workers get updates on app launch. Only native code changes need new APK sideload. Free with EAS |
| Logout with pending queue | **Warn before discarding** | Show modal: "You have N unsynced transactions. Logging out will discard them. Continue?" Attempt force-sync first if online. Prevents accidental data loss on shared devices |

### Android Platform

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Camera permission denied | **Auto-switch to manual mode** | If denied, scan screen defaults to Manual tab. Subtle message: "Camera unavailable. Search items by name." No error wall. No re-ask until app reinstall |
| Screen orientation | **Lock portrait always** | Set `orientation: 'portrait'` in app.json. Prevents accidental rotation in warehouse. All layouts consistent |
| Shared device behavior | **Keep domain preference on logout** | Most warehouse devices serve one domain. Employee B likely wants the same domain as Employee A. Fast login. Domain preference preserved |
| Hardware back button | **Standard back everywhere** | Back goes to previous screen. On Home (root), "Press back again to exit" toast. Batch preserved when going back from batch-review to scan |

### Missing Web Features

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Notifications | **Skip in v1** | Web notification feature is minimal. Mobile employees primarily need scan + submit. Add in future version |
| Manual search mode | **Local SQLite only** | SQL LIKE query on local items_cache. Works offline. Instant results. Cache refreshed periodically. No remote fallback needed |
| Quantity rules + display name | **Port both exactly as-is** | Copy DECIMAL_PLACES=3, MIN/MAX_QUANTITY constants and getDisplayName fallback chain (name > first+last > username > email prefix > "User"). Zero behavior drift |
| Test runner | **Vitest for logic, Jest for components** | Two runners: Vitest for hooks/utils/queue ops (fast, matches web), jest-expo for component tests (@testing-library/react-native requires Jest) |

### Technical Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Optimistic merge spec | **Detailed spec with pseudocode** | `applyPendingOperationsToItems` is the backbone of offline UX (~90 lines). Too important to leave ambiguous. Write full merge logic as pseudocode in spec |
| Data encryption | **None in v1** | Warehouse devices are company-owned. Physical security is company's responsibility. Encryption adds complexity and performance overhead on low-end phones |
| Naming convention | **Convert at SQLite boundary** | SQLite operations accept/return camelCase TypeScript objects. Each query function maps to/from snake_case SQL columns internally. Matches web pattern, zero extra dependencies |
| SQLite journal mode | **WAL mode enabled** | Set `PRAGMA journal_mode=WAL` on database init. Better concurrent read/write performance during sync. Standard mobile SQLite practice |
| URL polyfill | **Spec as setup requirement** | Document: "Import `react-native-url-polyfill/auto` at top of `backgroundTask.ts` AND root `_layout.tsx`. MUST run before any Supabase code." Prevents silent background sync failure |

### UX Refinements

| Decision | Choice | Rationale |
|----------|--------|-----------|
| History transaction detail | **Port stock_before/after + sync_status** | Show stock_before/after in detail modal and sync_status badge per row. Matches web parity. Important for audit trails |
| Sound mute behavior | **Respect device silent/vibrate mode** | No in-app toggle. If phone is on silent/vibrate, skip audio, use haptics only. If ringer is on, play sounds. Follows Android conventions |
| Slow cache fetch timeout | **60s timeout + proceed with partial** | After 60s, show "Connection is slow. Some items may be missing." Allow proceeding. Missing items found via manual search. Background completes cache |

### Contradictions Resolved

| Issue | Resolution |
|-------|-----------|
| Migration plan calls `clearQueue()` on domain switch | **Fix:** Remove `clearQueue()` from `setDomain` in migration plan. Spec's revised implementation (preserve queue) takes precedence |
| Migration plan says "Clear SQLite queue + items cache" on logout | **Fix:** Update to match spec: clear queues but keep items_cache. Add queue warning modal before clearing |
| Background sync `minimumInterval: 60` (1 min) | **Fix:** Document that Android clamps to ~15 min minimum. The 60s value is a hint, not a guarantee. Set to `900` (15 min) to be explicit |
| Vitest + jest-expo both listed | **Fix:** Clarify: Vitest for pure logic tests, jest-expo for React Native component tests. Two separate test configs |

### `applyPendingOperationsToItems` Pseudocode

Port this function from `src/lib/offline/db.ts:801-891`. The mobile version uses SQLite queries instead of IndexedDB but the merge logic is identical.

```
function applyPendingOperationsToItems(serverItems, domain):
  1. Get all pending operations from SQLite:
     - transactionQueue WHERE domain = current (or all if cross-domain)
     - itemCreateQueue WHERE status = 'pending'
     - itemEditQueue WHERE status = 'pending'
     - itemArchiveQueue WHERE status = 'pending'

  2. Clone serverItems into result list

  3. Apply transaction queue adjustments:
     FOR EACH queued transaction:
       - Find matching item in result list by item_id
       - IF found:
         - IF transaction_type = 'check_in': item.current_stock += quantity
         - IF transaction_type = 'check_out': item.current_stock -= quantity
         - IF transaction_type = 'adjustment': item.current_stock += quantity (signed)

  4. Apply offline-created items:
     FOR EACH queued item create:
       - Create a synthetic item object from item_data JSON
       - Set is_offline_created = true
       - Prepend to result list (appears first)

  5. Apply pending edits:
     FOR EACH queued item edit:
       - Find matching item in result list by item_id
       - IF found:
         - Parse changes JSON
         - Merge changes into item (name, description, category, etc.)

  6. Apply pending archives:
     FOR EACH queued item archive:
       - Find matching item in result list by item_id
       - IF found AND action = 'archive':
         - Set item.is_archived = true (will be filtered from display)
       - IF found AND action = 'restore':
         - Set item.is_archived = false

  7. Return result list (filtered to exclude is_archived unless needed)
```

**Key rules:**
- Operations applied in creation order within each queue
- Stock adjustments are additive (multiple pending check-outs for same item all subtract)
- Offline-created items use `temp_sku` as display identifier until synced
- If an item is in both edit and archive queues, archive takes precedence

### Logout Warning Flow

```
User taps "Log Out" on Profile screen
  ├── Check total queue count (all queue tables)
  │   ├── Count = 0 → Show standard confirmation: "Are you sure you want to log out?"
  │   └── Count > 0 → Check if online
  │       ├── Online → Show modal:
  │       │   "You have N unsynced transactions.
  │       │    Syncing now... [progress]"
  │       │   ├── Sync succeeds (count → 0) → Show standard confirmation
  │       │   └── Sync fails / partial → Show warning modal:
  │       │       "N transactions could not be synced.
  │       │        Logging out will discard them.
  │       │        [Cancel] [Log Out Anyway]"
  │       └── Offline → Show warning modal:
  │           "You have N unsynced transactions and are offline.
  │            Logging out will discard them.
  │            [Cancel] [Log Out Anyway]"
```

### New Route: Sync Errors Screen

Add to navigation/route table:

```
Route: (app)/sync-errors.tsx (stack screen, no tabs)
Purpose: View transactions that failed after 3 sync attempts
Access: Tap failed sync badge in MobileHeader
Empty state: "All transactions synced successfully" with checkmark icon
```

### New Setup Requirements

#### expo-updates Configuration

```json
// app.json additions
{
  "expo": {
    "updates": {
      "enabled": true,
      "fallbackToCacheTimeout": 0,
      "url": "https://u.expo.dev/[project-id]"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
}
```

OTA updates deploy JS bundle changes without new APK. Native dependency changes (new Expo modules, version bumps) still require new APK build + sideload.

#### URL Polyfill Import Order

Files that MUST import `react-native-url-polyfill/auto` as their first import:
- `app/_layout.tsx` (root layout)
- `lib/sync/backgroundTask.ts` (background sync task)

#### SQLite WAL Mode Init

```typescript
// lib/offline/db.ts - database initialization
const db = await SQLite.openDatabaseAsync('packtrack.db');
await db.execAsync('PRAGMA journal_mode=WAL');
```

---

## 7. Round 4 Decisions — Remaining Open Questions

> Decisions from interview round 4 (2026-02-18). Resolves all remaining open questions and adds tablet/deep link decisions.

### Data & UX Scope

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Max items per domain | **Under 500** | Small operation. Full cache fetch in seconds. No pagination needed. SQLite handles this trivially |
| Tablet layout | **Full tablet layout** | Responsive design with width-based breakpoints. Phone: <600dp, Tablet: >=600dp. Tablet gets maxWidth containers (520dp), 2-column grids for item lists, wider cards |
| Pending items in History | **Yes, show with 'pending' badge** | Prepend queued items to history with a yellow "Pending" badge. Gives offline transaction visibility. Removed on sync success |
| Sync errors retry | **Employee retry allowed** | Employees can tap "Retry" per failed item. Idempotent UUID prevents duplicates even if admin already resolved. More self-service |

### Infrastructure & Technical

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Health check endpoint | **Ping profiles table** | `supabase.from('profiles').select('id').limit(1)`. No extra infrastructure. Works for v1 scale |
| Backup file versioning | **Version stamp + discard old** | Backup file includes schema version. Mismatch on restore → discard and re-fetch from server. Simple and safe |
| CI/CD pipeline | **EAS Build (cloud)** | Expo's cloud build service. Free tier: 30 builds/month. Automated on push to main. APK downloadable from EAS dashboard |
| Shared types mechanism | **Copy + manual sync** | Copy `src/types/index.ts` to `mobile/src/types/`. Manual update when web types change. No tooling overhead at this scale |
| App signing keystore | **EAS-managed signing** | Expo stores keystore encrypted on their servers. Downloadable anytime. Zero local management |

### UX Details

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Offline banner threshold | **Fixed heuristic** | Show banner when offline for >10 seconds. No configuration. Matches common mobile app patterns |
| Status bar theming | **Per-screen status bar style** | Use `<StatusBar style='light'/>` on dark screens (scan camera) and `style='dark'` on light screens. Set per screen layout |
| Failed sync banner | **Yes, port the banner** | Tappable red bar below header: "N failed transactions — Tap to view". Links to sync-errors screen. Matches web parity |

### Tablet-Specific Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Breakpoint strategy | **Width-based with `useWindowDimensions()`** | Phone: <600dp, Tablet: >=600dp. Use a `useDeviceType()` hook returning `'phone' \| 'tablet'` |
| Tablet scan viewfinder | **Same viewfinder, centered** | Keep 280x280 viewfinder. Tablets don't need bigger target. Consistent UX, no camera config changes |
| Batch-review on tablet | **Single list always** | Quantity controls work best in full-width rows. No 2-column layout for batch-review on any device |
| Item list on tablet | **2-column grid** | Home screen item cards in 2-column `FlatList` with `numColumns={isTablet ? 2 : 1}`. Better use of tablet screen space |

### New Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Deep link scheme | **Register scheme, minimal routing** | Register `packtrack://` in app.json. Handle basic routes (home, scan). Low effort, enables future integrations |

### Tablet Layout Specification

```
Phone (<600dp):
  ┌──────────────┐
  │   Header     │
  ├──────────────┤
  │  [Item Card] │
  │  [Item Card] │
  │  [Item Card] │
  │  [Item Card] │
  ├──────────────┤
  │   Tab Bar    │
  └──────────────┘

Tablet (>=600dp):
  ┌────────────────────────┐
  │        Header          │
  ├────────────────────────┤
  │  [Card]    [Card]      │
  │  [Card]    [Card]      │
  │  [Card]    [Card]      │
  ├────────────────────────┤
  │        Tab Bar         │
  └────────────────────────┘
  Max content width: 520dp (centered)
```

**Screens affected by tablet layout:**
- Home: 2-column item grid
- Scan: Centered viewfinder (no change, already centered)
- Batch-review: Single column, max-width container
- History: Single column, max-width container (wider cards)
- Profile: Single column, max-width container
- Login: Centered card, max-width 400dp

### `useDeviceType` Hook

```typescript
// hooks/useDeviceType.ts
import { useWindowDimensions } from 'react-native';

const TABLET_BREAKPOINT = 600;

export function useDeviceType() {
  const { width } = useWindowDimensions();
  return {
    isTablet: width >= TABLET_BREAKPOINT,
    isPhone: width < TABLET_BREAKPOINT,
    screenWidth: width,
  };
}
```

### Pending History Items Specification

```
History screen item list:
  ┌─────────────────────────────────┐
  │ ● Pending (yellow badge)        │  ← Queued items prepended
  │   Rice Flour × 5   CHECK IN    │
  │   Just now · Pending sync       │
  ├─────────────────────────────────┤
  │ ● Synced                        │  ← Server items below
  │   Soy Sauce × 2   CHECK OUT    │
  │   2 min ago · Synced ✓         │
  └─────────────────────────────────┘
```

Data source: Merge SQLite `transaction_queue` (pending) with server history (synced). Pending items sorted by `created_at` descending, prepended before server items.

### Deep Link Configuration

```json
// app.json additions
{
  "expo": {
    "scheme": "packtrack",
    "plugins": [
      ["expo-router", { "root": "app" }]
    ]
  }
}
```

Supported routes in v1:
- `packtrack://` → Home screen
- `packtrack://scan?type=check_in` → Scan screen with check-in mode
- `packtrack://scan?type=check_out` → Scan screen with check-out mode

All deep links require active auth session. Unauthenticated deep links redirect to login, then forward to target after login.

### Backup File Format

```typescript
// lib/offline/backup.ts
interface BackupFile {
  schemaVersion: number;  // Increment on any SQLite schema change
  createdAt: string;      // ISO timestamp
  domain: string;         // Active domain at backup time
  data: {
    transactionQueue: QueuedTransaction[];
    itemEditQueue: QueuedEdit[];
    itemCreateQueue: QueuedCreate[];
    itemArchiveQueue: QueuedArchive[];
  };
}

// On restore:
// 1. Read backup file
// 2. Check schemaVersion matches current DB_SCHEMA_VERSION
// 3. If mismatch → discard backup, log warning, re-fetch from server
// 4. If match → insert rows into SQLite queue tables
```

### EAS Build Configuration

```json
// eas.json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

Build triggers:
- Push to `main` → production build (via GitHub Action calling `eas build`)
- Push to `develop` → preview build
- Manual trigger for development builds

---

## 8. Open Questions

All original open questions have been resolved. No remaining open questions.

| # | Question | Status |
|---|----------|--------|
| 1 | Max items per domain | **Resolved** — Under 500 |
| 2 | Tablet layout | **Resolved** — Full tablet layout with width-based breakpoints |
| 3 | Pending items in History | **Resolved** — Show with 'pending' badge |
| 4 | Slow cache timeout | **Resolved** — 60s timeout, proceed with partial |
| 5 | Sound mute | **Resolved** — Respect device silent/vibrate mode |
| 6 | Sync errors retry | **Resolved** — Employee retry allowed |
| 7 | Health check endpoint | **Resolved** — Ping profiles table |
| 8 | Backup versioning | **Resolved** — Version stamp + discard old |
| 9 | Offline banner threshold | **Resolved** — Fixed 10s heuristic |
| 10 | Status bar theming | **Resolved** — Per-screen style |
| 11 | Keystore backup | **Resolved** — EAS-managed signing |
| 12 | CI/CD pipeline | **Resolved** — EAS Build (cloud) |
| 13 | Shared types | **Resolved** — Copy + manual sync |
| 14 | Failed sync banner | **Resolved** — Port the banner |
