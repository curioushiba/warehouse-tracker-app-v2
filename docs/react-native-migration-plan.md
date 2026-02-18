# PackTrack Mobile: React Native Migration Plan

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Navigation Architecture](#2-navigation-architecture)
3. [Domain Switching System](#3-domain-switching-system)
4. [Design System](#4-design-system)
5. [Component Library](#5-component-library)
6. [Offline-First Data Layer](#6-offline-first-data-layer)
7. [Sync Engine](#7-sync-engine)
8. [Authentication](#8-authentication)
9. [Screen-by-Screen Mapping](#9-screen-by-screen-mapping)
10. [Dependencies](#10-dependencies)
11. [Implementation Phases](#11-implementation-phases)
12. [Testing Strategy](#12-testing-strategy)

---

## 1. Project Structure

```
mobile/
├── app/                              # Expo Router file-based routes
│   ├── _layout.tsx                   # Root layout (providers, splash)
│   ├── index.tsx                     # Entry redirect (→ auth check → domain picker or home)
│   ├── (auth)/
│   │   ├── _layout.tsx               # Auth layout (no tabs, no header)
│   │   └── login.tsx                 # Login screen
│   ├── (app)/
│   │   ├── _layout.tsx               # Authenticated layout (tab navigator + header)
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx           # Bottom tab bar configuration
│   │   │   ├── index.tsx             # Home screen (dashboard)
│   │   │   ├── scan.tsx              # Scan screen (camera + manual)
│   │   │   ├── history.tsx           # Transaction history
│   │   │   └── profile.tsx           # Profile & settings
│   │   └── batch-review.tsx          # Batch review (no tabs, back button)
│   └── domain-picker.tsx             # Domain selection screen (shown on first launch)
├── components/
│   ├── ui/                           # Design system primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Alert.tsx
│   │   ├── Avatar.tsx
│   │   ├── Modal.tsx                 # React Native Modal wrapper
│   │   ├── Switch.tsx
│   │   ├── Select.tsx                # Custom picker/dropdown
│   │   ├── Spinner.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Divider.tsx
│   │   ├── Toast.tsx                 # react-native-toast-message config
│   │   ├── Progress.tsx
│   │   ├── SearchInput.tsx
│   │   └── index.ts                  # Barrel export
│   ├── layout/
│   │   ├── MobileHeader.tsx          # Top header bar
│   │   ├── MobileBottomNav.tsx       # Bottom tab bar (handled by expo-router tabs)
│   │   └── ConnectionStatusBar.tsx   # Online/offline banner
│   ├── scanner/
│   │   ├── BarcodeScanner.tsx        # expo-camera barcode scanner
│   │   └── ScanSuccessOverlay.tsx    # Haptic + visual feedback overlay
│   ├── batch/
│   │   ├── BatchMiniList.tsx         # Compact batch item list
│   │   ├── BatchItemRow.tsx          # Full batch item row with quantity controls
│   │   └── BatchConfirmModal.tsx     # Submission confirmation modal
│   ├── items/
│   │   ├── ItemImage.tsx             # Item image with fallback
│   │   └── ItemSearchAutocomplete.tsx# Search-as-you-type item lookup
│   └── indicators/
│       ├── TransactionTypeBadge.tsx  # Check-in/out/adjustment badge
│       ├── SyncStatusIndicator.tsx   # Synced/pending/offline indicator
│       └── StockLevelBadge.tsx       # Stock level colored badge
├── contexts/
│   ├── AuthContext.tsx               # Authentication state + Supabase session
│   ├── DomainContext.tsx             # Active domain (commissary | frozen-goods)
│   ├── BatchScanContext.tsx          # Batch scan items state (direct port)
│   └── SettingsContext.tsx           # Currency, dark mode preferences
├── hooks/
│   ├── useOnlineStatus.ts           # NetInfo online/offline detection
│   ├── useSyncQueue.ts              # Transaction sync engine
│   ├── useSyncErrorCount.ts         # Failed sync error count
│   ├── useScanFeedback.ts           # Haptic + audio scan feedback
│   └── useSupabase.ts               # Supabase client access hook
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Supabase client singleton (MMKV storage adapter)
│   │   └── types.ts                 # Symlink or copy from shared types
│   ├── offline/
│   │   ├── db.ts                    # SQLite database init + operations
│   │   ├── migrations.ts            # SQLite schema migrations
│   │   └── queue.ts                 # Queue CRUD operations
│   ├── domain/
│   │   ├── config.ts                # DomainConfig (tables, RPCs per domain)
│   │   └── queries.ts               # Domain-aware Supabase queries
│   ├── storage/
│   │   └── mmkv.ts                  # MMKV instance + typed helpers
│   ├── events/
│   │   └── transactions.ts          # EventEmitter for transaction notifications
│   └── utils.ts                     # formatRelativeTime, formatDateTime, etc.
├── types/
│   ├── index.ts                     # Shared component variant types
│   ├── navigation.ts                # Navigation param types
│   └── database.ts                  # Database types (shared with web)
├── theme/
│   ├── tokens.ts                    # Color, typography, spacing tokens
│   ├── nativewind.ts                # NativeWind theme extension
│   └── fonts.ts                     # Font loading configuration
├── assets/
│   ├── fonts/
│   │   ├── Poppins-Regular.ttf
│   │   ├── Poppins-Medium.ttf
│   │   ├── Poppins-SemiBold.ttf
│   │   └── Poppins-Bold.ttf
│   ├── images/
│   │   ├── splash.png
│   │   └── icon.png
│   └── sounds/
│       └── scan-success.mp3
├── app.json                          # Expo configuration
├── babel.config.js                   # Babel config (NativeWind preset)
├── metro.config.js                   # Metro bundler config
├── nativewind-env.d.ts               # NativeWind TypeScript declarations
├── tailwind.config.ts                # NativeWind/Tailwind config (mobile tokens)
├── tsconfig.json                     # TypeScript config with path aliases
├── package.json
├── eas.json                          # EAS Build configuration
└── .env.example                      # Environment variable template
```

---

## 2. Navigation Architecture

### Expo Router Screen Map

```
Root _layout.tsx
├── index.tsx (redirect logic)
├── domain-picker.tsx (first launch only)
├── (auth)/_layout.tsx
│   └── login.tsx
└── (app)/_layout.tsx (requires auth)
    ├── (tabs)/_layout.tsx (bottom tab bar)
    │   ├── index.tsx      → Home
    │   ├── scan.tsx       → Scan
    │   ├── history.tsx    → History
    │   └── profile.tsx    → Profile
    └── batch-review.tsx   → Batch Review (stack screen, no tabs)
```

### Auth Flow

```
App Launch
  ├── Check MMKV for stored Supabase session
  │   ├── Session valid → Check MMKV for selected domain
  │   │   ├── Domain set → Navigate to (app)/(tabs)/
  │   │   └── No domain → Navigate to domain-picker
  │   └── No session / expired → Navigate to (auth)/login
  │
Login Success
  ├── Store session in MMKV (via Supabase storage adapter)
  ├── Fetch profile from Supabase
  ├── Check MMKV for selected domain
  │   ├── Domain set → Navigate to (app)/(tabs)/
  │   └── No domain → Navigate to domain-picker
  │
Domain Selected
  ├── Store domain in MMKV
  ├── Clear items cache (SQLite)
  ├── Navigate to (app)/(tabs)/
  │
Logout
  ├── Sign out via Supabase
  ├── Clear SQLite queue + items cache
  ├── Clear MMKV session data (keep domain preference)
  └── Navigate to (auth)/login
```

### Tab Layout Configuration

```typescript
// app/(app)/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Home, QrCode, History, User } from 'lucide-react-native';
import { useDomain } from '@/contexts/DomainContext';

export default function TabLayout() {
  const { brandColor } = useDomain();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: brandColor,
        tabBarInactiveTintColor: '#4d6b4d',
        headerShown: false,        // Custom header via MobileHeader
        tabBarStyle: {
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopColor: '#d4d9c8',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, size }) => <QrCode color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <History color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
```

---

## 3. Domain Switching System

### DomainContext Design

```typescript
// contexts/DomainContext.tsx
import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { storage } from '@/lib/storage/mmkv';
import { clearItemsCache, clearCategoriesCache, clearQueue } from '@/lib/offline/db';

export type Domain = 'commissary' | 'frozen-goods';

interface DomainBranding {
  name: string;
  shortName: string;
  brandColor: string;
  headerLetter: string;
  icon: string; // lucide icon name
  loginBackground: string;
  gradientFrom: string;
  gradientTo: string;
}

const DOMAIN_BRANDING: Record<Domain, DomainBranding> = {
  commissary: {
    name: 'Commissary',
    shortName: 'CM',
    brandColor: '#E07A2F',
    headerLetter: 'C',
    icon: 'ChefHat',
    loginBackground: '#FFF8F0',
    gradientFrom: '#E07A2F',
    gradientTo: '#C45A1A',
  },
  'frozen-goods': {
    name: 'Frozen Goods',
    shortName: 'FG',
    brandColor: '#3B82F6',
    headerLetter: 'F',
    icon: 'Snowflake',
    loginBackground: '#F0F7FF',
    gradientFrom: '#3B82F6',
    gradientTo: '#1D4ED8',
  },
};

interface DomainConfig {
  itemsTable: 'cm_items' | 'fg_items';
  transactionsTable: 'cm_transactions' | 'fg_transactions';
  submitRpc: 'submit_cm_transaction' | 'submit_fg_transaction';
}

const DOMAIN_CONFIG: Record<Domain, DomainConfig> = {
  commissary: {
    itemsTable: 'cm_items',
    transactionsTable: 'cm_transactions',
    submitRpc: 'submit_cm_transaction',
  },
  'frozen-goods': {
    itemsTable: 'fg_items',
    transactionsTable: 'fg_transactions',
    submitRpc: 'submit_fg_transaction',
  },
};

interface DomainContextValue {
  domain: Domain | null;
  setDomain: (domain: Domain) => Promise<void>;
  config: DomainConfig | null;
  branding: DomainBranding | null;
  brandColor: string;
  isReady: boolean;
}

const DomainContext = createContext<DomainContextValue | undefined>(undefined);

const STORAGE_KEY = 'packtrack.activeDomain';

export function DomainProvider({ children }: { children: ReactNode }) {
  const [domain, setDomainState] = useState<Domain | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Load persisted domain on mount
  useEffect(() => {
    const stored = storage.getString(STORAGE_KEY) as Domain | undefined;
    if (stored && (stored === 'commissary' || stored === 'frozen-goods')) {
      setDomainState(stored);
    }
    setIsReady(true);
  }, []);

  const setDomain = useCallback(async (newDomain: Domain) => {
    if (newDomain === domain) return;

    // Clear domain-specific caches when switching
    await Promise.all([
      clearItemsCache(),
      clearCategoriesCache(),
      clearQueue(),
    ]);

    storage.set(STORAGE_KEY, newDomain);
    setDomainState(newDomain);
  }, [domain]);

  const value = useMemo<DomainContextValue>(() => ({
    domain,
    setDomain,
    config: domain ? DOMAIN_CONFIG[domain] : null,
    branding: domain ? DOMAIN_BRANDING[domain] : null,
    brandColor: domain ? DOMAIN_BRANDING[domain].brandColor : '#01722f',
    isReady,
  }), [domain, setDomain, isReady]);

  return (
    <DomainContext.Provider value={value}>
      {children}
    </DomainContext.Provider>
  );
}

export function useDomain() {
  const context = useContext(DomainContext);
  if (!context) {
    throw new Error('useDomain must be used within DomainProvider');
  }
  return context;
}
```

### UX Flow

1. **First launch**: App checks MMKV for `packtrack.activeDomain`. If not set, redirect to `domain-picker.tsx`.
2. **Domain picker screen**: Two large tappable cards (Commissary orange, Frozen Goods blue) with icons and names. User taps one.
3. **On selection**: Domain persisted to MMKV, SQLite caches cleared, app navigates to home.
4. **Switching domains**: Available from Profile screen via "Switch Domain" button. Same flow: clear caches, persist new choice, navigate to home.
5. **Domain indicator**: Header always shows the domain letter (C or F) in the branded color as the app icon.

### Persistence

- **Storage**: `react-native-mmkv` key `packtrack.activeDomain`
- **Survives**: App restarts, kills, updates
- **Cleared on**: Explicit domain switch (caches cleared, domain key overwritten)
- **NOT cleared on**: Logout (domain preference preserved so user doesn't re-pick on next login)

---

## 4. Design System

### Theme Tokens

All tokens are sourced from the web app's `tailwind.config.ts` and `globals.css`, adapted for React Native.

#### Colors

```typescript
// theme/tokens.ts
export const colors = {
  // Primary Brand
  primary: {
    50: '#e6f4eb',
    100: '#b3dfc4',
    200: '#80ca9d',
    300: '#4db576',
    400: '#26a45a',
    500: '#01722f', // DEFAULT
    600: '#016628',
    700: '#015521',
    800: '#01441a',
    900: '#003310',
    950: '#002209',
    foreground: '#ffffff',
  },

  // Secondary - Rum Swizzle (Cream)
  secondary: {
    50: '#fef9f0',
    100: '#fdf5e9',
    200: '#fbedd4',
    300: '#f8e2ba',
    400: '#f5d7a0',
    500: '#faf5e9', // DEFAULT
    600: '#e8dcc7',
    700: '#c9bda6',
    800: '#aa9e85',
    900: '#8b7f64',
    950: '#6c6043',
    foreground: '#003400',
  },

  // Accent - Cinnabar Red
  accent: {
    DEFAULT: '#e13c30',
    light: '#f5706a',
    dark: '#b82d23',
    foreground: '#ffffff',
  },

  // CTA - Bright Yellow
  cta: {
    DEFAULT: '#ffcc00',
    light: '#ffe066',
    dark: '#cc9900',
    hover: '#e6b800',
    active: '#b38600',
    foreground: '#003400',
  },

  // Foreground/Text
  foreground: {
    DEFAULT: '#003400',
    secondary: '#1a4d1a',
    muted: '#4d6b4d',
    placeholder: '#7a9a7a',
    disabled: '#a8c4a8',
  },

  // Background
  background: {
    DEFAULT: '#ffffff',
    secondary: '#faf5e9',
    tertiary: '#f5f0e3',
    sunken: '#f0ebe0',
    elevated: '#ffffff',
  },

  // Border
  border: {
    DEFAULT: '#d4d9c8',
    secondary: '#e8ede0',
    strong: '#003400',
    focus: '#01722f',
  },

  // Neutral
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
    950: '#121212',
    1000: '#000000',
  },

  // Semantic
  success: { light: '#d4edda', DEFAULT: '#28a745', dark: '#155724', foreground: '#ffffff' },
  warning: { light: '#fff3cd', DEFAULT: '#ffc107', dark: '#856404', foreground: '#003400' },
  error:   { light: '#f8d7da', DEFAULT: '#dc3545', dark: '#721c24', foreground: '#ffffff' },
  info:    { light: '#d1ecf1', DEFAULT: '#17a2b8', dark: '#0c5460', foreground: '#ffffff' },

  // Domain-specific branding
  domain: {
    commissary: { primary: '#E07A2F', dark: '#C45A1A', bg: '#FFF8F0' },
    frozenGoods: { primary: '#3B82F6', dark: '#1D4ED8', bg: '#F0F7FF' },
  },
} as const;
```

#### Typography

```typescript
export const typography = {
  fonts: {
    heading: 'Poppins-SemiBold',   // Simplified for mobile (no Mandai Value Serif)
    body: 'Poppins-Regular',
    bodyMedium: 'Poppins-Medium',
    bodySemiBold: 'Poppins-SemiBold',
    bodyBold: 'Poppins-Bold',
    mono: 'SpaceMono-Regular',      // Fallback monospace
  },

  sizes: {
    display: { fontSize: 36, lineHeight: 40, letterSpacing: -0.72 },
    h1:      { fontSize: 30, lineHeight: 36, letterSpacing: -0.45 },
    h2:      { fontSize: 24, lineHeight: 30, letterSpacing: -0.24 },
    h3:      { fontSize: 20, lineHeight: 26, letterSpacing: -0.1 },
    h4:      { fontSize: 18, lineHeight: 24 },
    h5:      { fontSize: 16, lineHeight: 22 },
    h6:      { fontSize: 14, lineHeight: 20 },
    body:    { fontSize: 14, lineHeight: 20 },
    bodySm:  { fontSize: 12, lineHeight: 16 },
    bodyXs:  { fontSize: 10, lineHeight: 14 },
    caption: { fontSize: 11, lineHeight: 14 },
  },
} as const;
```

#### Spacing

```typescript
export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  4.5: 18,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  18: 72,
  20: 80,
  22: 88,
} as const;
```

#### Shadows (Platform-Specific)

```typescript
import { Platform } from 'react-native';

export const shadows = {
  xs: Platform.select({
    ios: { shadowColor: '#003400', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1 },
    android: { elevation: 1 },
  }),
  sm: Platform.select({
    ios: { shadowColor: '#003400', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios: { shadowColor: '#003400', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6 },
    android: { elevation: 4 },
  }),
  lg: Platform.select({
    ios: { shadowColor: '#003400', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15 },
    android: { elevation: 8 },
  }),
  xl: Platform.select({
    ios: { shadowColor: '#003400', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.1, shadowRadius: 25 },
    android: { elevation: 12 },
  }),
} as const;
```

#### Border Radii

```typescript
export const radii = {
  none: 0,
  sm: 4,
  input: 8,
  card: 12,
  modal: 16,
  button: 22.5,
  xl: 24,
  full: 9999,
} as const;
```

### NativeWind Configuration

```typescript
// tailwind.config.ts (mobile)
import type { Config } from 'tailwindcss';
import { colors, spacing, radii, typography } from './theme/tokens';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors,
      spacing,
      borderRadius: {
        card: `${radii.card}px`,
        input: `${radii.input}px`,
        button: `${radii.button}px`,
        modal: `${radii.modal}px`,
      },
      fontFamily: {
        heading: [typography.fonts.heading],
        body: [typography.fonts.body],
        'body-medium': [typography.fonts.bodyMedium],
        'body-semibold': [typography.fonts.bodySemiBold],
        'body-bold': [typography.fonts.bodyBold],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### Component Inventory (Priority Order)

| Priority | Component | Web Source | Notes |
|----------|-----------|-----------|-------|
| P0 | Button | `ui/Button.tsx` | All 7 variants + loading state |
| P0 | Card | `ui/Card.tsx` | 5 variants (elevated, outline, filled, spotlight, unstyled) |
| P0 | Input | `ui/Input.tsx` | 3 variants + error state |
| P0 | Badge | `ui/Badge.tsx` | 7 color schemes, 3 variants |
| P0 | Alert | `ui/Alert.tsx` | 4 statuses, 4 variants |
| P0 | Modal | `ui/Modal.tsx` | RN Modal with header/body/footer |
| P0 | Avatar | `ui/Avatar.tsx` | Initials fallback, 6 sizes |
| P0 | Spinner | `ui/Spinner.tsx` | ActivityIndicator wrapper |
| P1 | Switch | `ui/Switch.tsx` | RN Switch wrapper |
| P1 | Select | `ui/Select.tsx` | Custom bottom sheet picker |
| P1 | SearchInput | `ui/Input.tsx` | Input with search icon + clear |
| P1 | Skeleton | `ui/Skeleton.tsx` | Animated placeholder |
| P1 | Divider | `ui/Divider.tsx` | Horizontal/vertical separator |
| P1 | Toast | `ui/Toast.tsx` | react-native-toast-message |
| P1 | Progress | `ui/Progress.tsx` | Linear progress bar |
| P2 | TransactionTypeBadge | `ui/StatusIndicators.tsx` | Check-in/out colored badge |
| P2 | SyncStatusIndicator | `ui/StatusIndicators.tsx` | Synced/pending/offline |
| P2 | ConnectionStatusBar | `layout/MobileLayout.tsx` | Top banner for offline state |
| P2 | StockLevelBadge | Custom | Stock level colored badge |

---

## 5. Component Library

### Button

```typescript
interface ButtonProps {
  variant: 'cta' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
  size: 'xs' | 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  isFullWidth?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}
```

**Mapping from web**: `onClick` → `onPress`, `className` → NativeWind `className`, `<button>` → `<Pressable>`.

### Card

```typescript
interface CardProps {
  variant: 'elevated' | 'outline' | 'filled' | 'spotlight' | 'unstyled';
  isHoverable?: boolean; // Maps to Pressable with opacity feedback
  onPress?: () => void;
  children: React.ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}
```

**Mapping**: `<div>` → `<View>`, `hover:shadow-lg` → `Pressable` with `onPressIn/onPressOut` opacity change, `overflow-hidden` → `overflow: 'hidden'` style.

### Input

```typescript
interface InputProps {
  variant: 'outline' | 'filled' | 'flushed';
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  isInvalid?: boolean;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: KeyboardTypeOptions;
}
```

**Mapping**: `onChange` → `onChangeText`, `<input>` → `<TextInput>`, CSS pseudo-classes → state-based styling.

### Badge

```typescript
interface BadgeProps {
  variant: 'solid' | 'subtle' | 'outline';
  colorScheme: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size: 'xs' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}
```

### Alert

```typescript
interface AlertProps {
  status: 'info' | 'success' | 'warning' | 'error';
  variant: 'subtle' | 'solid' | 'left-accent' | 'top-accent';
  children: React.ReactNode;
  icon?: React.ReactNode;
}
```

**Mapping**: `left-accent` → `borderLeftWidth: 4`, `top-accent` → `borderTopWidth: 4`.

### Modal

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  size: 'sm' | 'md' | 'lg' | 'full';
  children: React.ReactNode;
}

interface ModalHeaderProps {
  children: React.ReactNode;
  showCloseButton?: boolean;
  onClose?: () => void;
}

interface ModalBodyProps {
  children: React.ReactNode;
}

interface ModalFooterProps {
  children: React.ReactNode;
}
```

**Mapping**: HTML `<dialog>` → RN `<Modal>` with `transparent` background + animated overlay. `size="full"` → covers entire screen.

### Avatar

```typescript
interface AvatarProps {
  name: string;
  src?: string;
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}
```

**Size map**: `xs=24, sm=32, md=40, lg=48, xl=56, 2xl=72`.

### Select (Custom Picker)

```typescript
interface SelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}
```

**Mapping**: Web `<select>` → Bottom sheet modal with `FlatList` of options. Tapping an option calls `onChange` and closes the sheet.

### Toast

```typescript
// Uses react-native-toast-message
function showToast(params: {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}): void;
```

---

## 6. Offline-First Data Layer

### SQLite Schema

Ported from IndexedDB (`src/lib/offline/db.ts`), mapped to SQLite tables:

```sql
-- migrations.ts: Version 1

-- Transaction queue (maps to IndexedDB 'transactionQueue' store)
CREATE TABLE IF NOT EXISTS transaction_queue (
  id TEXT PRIMARY KEY,
  transaction_type TEXT NOT NULL,  -- 'check_in' | 'check_out' | 'adjustment' etc.
  item_id TEXT NOT NULL,
  quantity REAL NOT NULL,
  notes TEXT,
  source_location_id TEXT,
  destination_location_id TEXT,
  device_timestamp TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  domain TEXT  -- 'commissary' | 'frozen-goods'
);
CREATE INDEX IF NOT EXISTS idx_txq_created ON transaction_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_txq_item ON transaction_queue(item_id);

-- Items cache (maps to IndexedDB 'itemsCache' store)
CREATE TABLE IF NOT EXISTS items_cache (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id TEXT,
  location_id TEXT,
  unit TEXT NOT NULL DEFAULT 'pcs',
  current_stock REAL NOT NULL DEFAULT 0,
  min_stock REAL NOT NULL DEFAULT 0,
  max_stock REAL,
  barcode TEXT,
  unit_price REAL,
  image_url TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  is_offline_created INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  domain TEXT  -- which domain this item belongs to
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_sku ON items_cache(sku);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON items_cache(barcode);
CREATE INDEX IF NOT EXISTS idx_items_domain ON items_cache(domain);

-- Metadata key-value store (maps to IndexedDB 'metadata' store)
CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Item edit queue (maps to IndexedDB 'itemEditQueue' store)
CREATE TABLE IF NOT EXISTS item_edit_queue (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  changes TEXT NOT NULL,  -- JSON stringified Partial<ItemUpdate>
  expected_version INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'syncing' | 'failed'
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  device_timestamp TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ieq_created ON item_edit_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_ieq_item ON item_edit_queue(item_id);
CREATE INDEX IF NOT EXISTS idx_ieq_status ON item_edit_queue(status);

-- Item create queue (maps to IndexedDB 'itemCreateQueue' store)
CREATE TABLE IF NOT EXISTS item_create_queue (
  id TEXT PRIMARY KEY,
  temp_sku TEXT NOT NULL,
  item_data TEXT NOT NULL,  -- JSON stringified Partial<ItemInsert>
  idempotency_key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  device_timestamp TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_icq_created ON item_create_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_icq_status ON item_create_queue(status);

-- Item archive queue (maps to IndexedDB 'itemArchiveQueue' store)
CREATE TABLE IF NOT EXISTS item_archive_queue (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  action TEXT NOT NULL,  -- 'archive' | 'restore'
  expected_version INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  device_timestamp TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_iaq_created ON item_archive_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_iaq_item ON item_archive_queue(item_id);
CREATE INDEX IF NOT EXISTS idx_iaq_status ON item_archive_queue(status);

-- Pending images (maps to IndexedDB 'pendingImages' store)
-- Note: Blob stored as file path on disk instead of inline blob
CREATE TABLE IF NOT EXISTS pending_images (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  is_offline_item INTEGER NOT NULL DEFAULT 0,
  file_path TEXT NOT NULL,   -- Local file system path (replaces Blob)
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'uploading' | 'failed' | 'waiting_for_item'
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);
CREATE INDEX IF NOT EXISTS idx_pi_status ON pending_images(status);
CREATE INDEX IF NOT EXISTS idx_pi_item ON pending_images(item_id);

-- Categories cache (maps to IndexedDB 'categoriesCache' store)
CREATE TABLE IF NOT EXISTS categories_cache (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_id TEXT,
  created_at TEXT NOT NULL
);
```

### Key Differences from IndexedDB

| Feature | IndexedDB (Web) | SQLite (RN) |
|---------|----------------|-------------|
| Blob storage | Inline in store | File path on disk (`FileSystem.documentDirectory`) |
| Indexes | IDB indexes | SQL indexes |
| Transactions | IDB transactions | SQLite `BEGIN/COMMIT` |
| JSON fields | Native objects | JSON.stringify/parse |
| UUID generation | `crypto.randomUUID()` | `expo-crypto` `randomUUID()` |
| Domain filtering | Not indexed | `domain` column + index on `items_cache` |

### Queue Operations API

```typescript
// lib/offline/queue.ts - Direct port of db.ts operations

// Transaction Queue
export async function addToQueue(tx: Omit<QueuedTransaction, 'retryCount' | 'createdAt'>): Promise<void>;
export async function getQueuedTransactions(): Promise<QueuedTransaction[]>;
export async function getQueueCount(): Promise<number>;
export async function removeFromQueue(id: string): Promise<void>;
export async function incrementRetryCount(id: string, error: string): Promise<void>;
export async function clearQueue(): Promise<void>;

// Items Cache
export async function cacheItems(items: CachedItem[], domain: Domain): Promise<void>;
export async function getCachedItem(id: string): Promise<CachedItem | undefined>;
export async function getCachedItemByBarcode(barcode: string): Promise<CachedItem | undefined>;
export async function getAllCachedItems(domain: Domain): Promise<CachedItem[]>;
export async function clearItemsCache(): Promise<void>;

// Item Edit Queue
export async function addItemEditToQueue(edit: QueuedItemEditInput): Promise<QueuedItemEdit>;
export async function getQueuedItemEdits(): Promise<QueuedItemEdit[]>;
export async function updateItemEditStatus(id: string, status: string, error?: string): Promise<void>;
export async function removeItemEditFromQueue(id: string): Promise<void>;

// Item Create Queue
export async function addItemCreateToQueue(data: Partial<ItemInsert>, userId: string): Promise<QueuedItemCreate>;
export async function getQueuedItemCreates(): Promise<QueuedItemCreate[]>;
export async function removeItemCreateFromQueue(id: string): Promise<void>;

// Item Archive Queue
export async function addItemArchiveToQueue(itemId: string, action: 'archive' | 'restore', version: number, userId: string): Promise<QueuedItemArchive>;
export async function getQueuedItemArchives(): Promise<QueuedItemArchive[]>;
export async function removeItemArchiveFromQueue(id: string): Promise<void>;

// Pending Images
export async function addPendingImage(itemId: string, filePath: string, filename: string, isOffline?: boolean): Promise<PendingImage>;
export async function getPendingImages(): Promise<PendingImage[]>;
export async function removePendingImage(id: string): Promise<void>;

// Categories Cache
export async function cacheCategories(categories: CachedCategory[]): Promise<void>;
export async function getAllCachedCategories(): Promise<CachedCategory[]>;

// Aggregate counts
export async function getAllQueueCounts(): Promise<QueueCounts>;
```

---

## 7. Sync Engine

### useSyncQueue Port

Direct port of `src/hooks/useSyncQueue.ts` with these adaptations:

```typescript
// hooks/useSyncQueue.ts

import { useEffect, useState, useCallback, useRef } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { useAuth } from '@/contexts/AuthContext';
import { useDomain } from '@/contexts/DomainContext';
import { supabase } from '@/lib/supabase/client';
import {
  getQueuedTransactions,
  getQueueCount,
  removeFromQueue,
  incrementRetryCount,
  addToQueue,
  type QueuedTransaction,
} from '@/lib/offline/queue';
import { transactionEvents } from '@/lib/events/transactions';

const MAX_RETRIES = 3;
const SYNC_INTERVAL = 30000; // 30 seconds

interface SyncState {
  queueCount: number;
  isSyncing: boolean;
  lastSyncTime: string | null;
  lastError: string | null;
}

export function useSyncQueue() {
  const { isOnline, wasOffline, clearWasOffline } = useOnlineStatus();
  const { user, isAuthenticated } = useAuth();
  const { config, domain } = useDomain();
  const [state, setState] = useState<SyncState>({
    queueCount: 0,
    isSyncing: false,
    lastSyncTime: null,
    lastError: null,
  });

  const syncInProgressRef = useRef(false);

  // Load queue count on mount
  useEffect(() => {
    getQueueCount()
      .then(count => setState(prev => ({ ...prev, queueCount: count })))
      .catch(console.error);
  }, []);

  // Process a single transaction via direct Supabase RPC
  const processTransaction = useCallback(async (transaction: QueuedTransaction): Promise<boolean> => {
    if (!config || !user) return false;

    try {
      // Determine which RPC to call based on transaction domain
      const rpcName = transaction.domain === 'frozen-goods'
        ? 'submit_fg_transaction'
        : transaction.domain === 'commissary'
          ? 'submit_cm_transaction'
          : 'submit_transaction';

      const { error } = await supabase.rpc(rpcName, {
        p_transaction_type: transaction.transactionType,
        p_item_id: transaction.itemId,
        p_quantity: transaction.quantity,
        p_user_id: user.id,
        p_notes: transaction.notes || null,
        p_source_location_id: transaction.sourceLocationId || null,
        p_destination_location_id: transaction.destinationLocationId || null,
        p_idempotency_key: transaction.idempotencyKey,
        p_device_timestamp: transaction.deviceTimestamp,
      });

      if (error) throw new Error(error.message);

      // Success - remove from queue and notify
      await removeFromQueue(transaction.id);
      transactionEvents.emit('submitted');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (transaction.retryCount >= MAX_RETRIES - 1) {
        // Max retries - record to sync_errors table
        await supabase.from('sync_errors').insert({
          transaction_data: transaction as any,
          error_message: errorMessage,
          user_id: user.id,
        });
        await removeFromQueue(transaction.id);
      } else {
        await incrementRetryCount(transaction.id, errorMessage);
      }
      return false;
    }
  }, [config, user]);

  // Sync all queued transactions
  const syncQueue = useCallback(async () => {
    if (syncInProgressRef.current || !isOnline || !isAuthenticated) return;

    syncInProgressRef.current = true;
    setState(prev => ({ ...prev, isSyncing: true, lastError: null }));

    try {
      const transactions = await getQueuedTransactions();

      for (const transaction of transactions) {
        if (!isOnline) break;
        await processTransaction(transaction);
      }

      const remainingCount = await getQueueCount();
      setState(prev => ({
        ...prev,
        queueCount: remainingCount,
        lastSyncTime: new Date().toISOString(),
        isSyncing: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        lastError: error instanceof Error ? error.message : 'Sync failed',
        isSyncing: false,
      }));
    } finally {
      syncInProgressRef.current = false;
    }
  }, [isOnline, isAuthenticated, processTransaction]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (wasOffline && isOnline && isAuthenticated) {
      syncQueue();
      clearWasOffline();
    }
  }, [wasOffline, isOnline, isAuthenticated, syncQueue, clearWasOffline]);

  // Periodic sync
  useEffect(() => {
    if (!isOnline || !isAuthenticated) return;

    const interval = setInterval(() => {
      if (state.queueCount > 0) syncQueue();
    }, SYNC_INTERVAL);

    return () => clearInterval(interval);
  }, [isOnline, isAuthenticated, state.queueCount, syncQueue]);

  // Queue a transaction
  const queueTransaction = useCallback(async (
    transaction: Omit<QueuedTransaction, 'id' | 'retryCount' | 'createdAt' | 'userId' | 'idempotencyKey'>
  ) => {
    if (!user) throw new Error('User not authenticated');

    const id = randomUUID();
    const idempotencyKey = randomUUID();

    await addToQueue({
      ...transaction,
      id,
      idempotencyKey,
      userId: user.id,
      deviceTimestamp: transaction.deviceTimestamp || new Date().toISOString(),
      domain: transaction.domain || domain || undefined,
    });

    const count = await getQueueCount();
    setState(prev => ({ ...prev, queueCount: count }));

    if (isOnline) syncQueue();

    return { id, idempotencyKey };
  }, [user, isOnline, domain, syncQueue]);

  return {
    ...state,
    queueTransaction,
    syncQueue,
    isOnline,
  };
}
```

### Key Differences from Web

| Aspect | Web (PWA) | React Native |
|--------|-----------|-------------|
| API calls | `fetch('/api/transactions/submit')` | Direct `supabase.rpc('submit_*_transaction')` |
| Sync errors | `fetch('/api/sync-errors')` | Direct `supabase.from('sync_errors').insert()` |
| UUID generation | `crypto.randomUUID()` | `expo-crypto.randomUUID()` |
| Online detection | `navigator.onLine` + events | `@react-native-community/netinfo` |
| Background sync | Service Worker (limited) | `expo-background-fetch` + `expo-task-manager` |
| Domain routing | URL-based (`/api/frozen-goods/...`) | RPC name from DomainContext |

### Background Sync (Expo Task Manager)

```typescript
// lib/sync/backgroundTask.ts
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

const BACKGROUND_SYNC_TASK = 'packtrack-background-sync';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  const count = await getQueueCount();
  if (count === 0) return BackgroundFetch.BackgroundFetchResult.NoData;

  try {
    const transactions = await getQueuedTransactions();
    let synced = 0;

    for (const tx of transactions) {
      const success = await processTransactionDirectly(tx);
      if (success) synced++;
    }

    return synced > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.Failed;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync() {
  await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
    minimumInterval: 60, // 1 minute minimum
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
```

---

## 8. Authentication

### Supabase Client Setup with MMKV

```typescript
// lib/supabase/client.ts
import 'react-native-url-polyfill/auto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { MMKV } from 'react-native-mmkv';
import type { Database } from './types';

const mmkv = new MMKV({ id: 'supabase-auth' });

// MMKV storage adapter for Supabase Auth
const mmkvStorageAdapter = {
  getItem: (key: string) => {
    const value = mmkv.getString(key);
    return value ?? null;
  },
  setItem: (key: string, value: string) => {
    mmkv.set(key, value);
  },
  removeItem: (key: string) => {
    mmkv.delete(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: mmkvStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for RN
  },
});
```

### AuthContext Port

```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@/lib/supabase/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  isActive: boolean;
  signIn: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) return null;
      return data as Profile;
    } catch {
      return null;
    }
  };

  const refreshProfile = useCallback(async () => {
    if (user) {
      const data = await fetchProfile(user.id);
      setProfile(data);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!isMounted) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          const profileData = await fetchProfile(newSession.user.id);
          if (isMounted) {
            setProfile(profileData);
            setIsLoading(false);
          }
        } else {
          if (isMounted) {
            setProfile(null);
            setIsLoading(false);
          }
        }
      }
    );

    // Safety timeout
    const timeout = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 10000);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    try {
      // Look up email from username (same as web signInEmployee)
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, id')
        .eq('username', username.toLowerCase())
        .single();

      if (!profile?.email) {
        return { success: false, error: 'Invalid username or password' };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin',
    isEmployee: profile?.role === 'employee',
    isActive: profile?.is_active ?? false,
    signIn,
    signOut,
    refreshProfile,
  }), [user, profile, session, isLoading, signIn, signOut, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

### Session Persistence

- **Storage**: MMKV (synchronous, encrypted-capable)
- **Auto-refresh**: Supabase JS client handles token refresh automatically
- **detectSessionInUrl**: Set to `false` (no deep link auth in v1)
- **On app foreground**: Supabase auto-refreshes expired tokens via `onAuthStateChange`

---

## 9. Screen-by-Screen Mapping

### Screen Inventory

Both CM and FG PWAs have identical screens. The RN app consolidates them into one set of screens parameterized by `DomainContext`.

| # | PWA Screen | RN Route | PWA Files |
|---|-----------|----------|-----------|
| 1 | Login | `(auth)/login` | `commissarypwa/login/page.tsx`, `frozengoodspwa/login/page.tsx` |
| 2 | Home (Dashboard) | `(app)/(tabs)/index` | `commissarypwa/page.tsx`, `frozengoodspwa/page.tsx` |
| 3 | Scan (Camera + Manual) | `(app)/(tabs)/scan` | `commissarypwa/scan/page.tsx`, `frozengoodspwa/scan/page.tsx` |
| 4 | Batch Review | `(app)/batch-review` | `commissarypwa/batch-review/page.tsx`, `frozengoodspwa/batch-review/page.tsx` |
| 5 | History | `(app)/(tabs)/history` | `commissarypwa/history/page.tsx`, `frozengoodspwa/history/page.tsx` |
| 6 | Profile | `(app)/(tabs)/profile` | `commissarypwa/profile/page.tsx`, `frozengoodspwa/profile/page.tsx` |

**Additional RN-only screen:**
| 7 | Domain Picker | `domain-picker` | N/A (new screen for domain switching) |

### Screen Details

#### 1. Login Screen

**PWA source**: `commissarypwa/login/page.tsx`

**Behavior (identical)**:
- Username + password form
- Client-side validation (empty fields)
- Call `signIn(username, password)` via AuthContext
- On success, navigate to home (or domain-picker if no domain selected)

**RN differences**:
- `<TextInput>` instead of `<input>`, `keyboardType="default"`, `autoCapitalize="none"`
- `secureTextEntry` instead of `type="password"`
- Eye icon toggle for password visibility (same)
- `KeyboardAvoidingView` for iOS keyboard handling
- Brand icon and colors from `DomainContext.branding` (or default PackTrack green if no domain yet)
- No `useRouter`/`useSearchParams` - use `expo-router` `router.replace()`

#### 2. Home Screen (Dashboard)

**PWA source**: `commissarypwa/page.tsx`

**Behavior (identical)**:
- Welcome section with user name, avatar, gradient card in domain brand colors
- Stats: Today's transactions count, pending sync count, failed syncs count
- Two large action buttons: IN (green) and OUT (red)
- Method selection modal: Scan (camera) vs Manual (search)
- Recent activity list (3 most recent transactions with item names)
- Sync status card (shown when queue > 0)

**RN differences**:
- `<ScrollView>` instead of `<div className="space-y-6">`
- `<Pressable>` instead of `<button>` for action cards
- Haptic feedback on IN/OUT button press via `expo-haptics`
- Modal uses RN `<Modal>` component
- Gradient card uses `expo-linear-gradient` instead of CSS `bg-gradient-to-br`
- Domain-specific data fetched via direct Supabase query (not server action)
- Brand colors come from `useDomain().branding`

#### 3. Scan Screen

**PWA source**: `commissarypwa/scan/page.tsx`

**Behavior (identical)**:
- Toggle between Camera and Manual modes
- Camera mode: barcode scanner, looking-up indicator, error display, batch mini-list
- Manual mode: search autocomplete, recent items list, batch mini-list
- "Done Scanning" button navigating to batch-review
- Duplicate item detection with confirmation modal
- Scan success overlay with haptic/audio feedback

**RN differences**:
- `expo-camera` `CameraView` with `barcodeScannerSettings` instead of `html5-qrcode`
- `expo-haptics` for scan feedback (Haptics.notificationAsync)
- `expo-av` for scan success sound
- `<FlatList>` for recent items instead of mapped `<div>`
- No `dynamic()` import needed - camera component loaded normally
- Torch toggle via `CameraView.enableTorch` prop
- URL params (`?type=check_in&mode=manual`) → route params or `useLocalSearchParams()`

#### 4. Batch Review Screen

**PWA source**: `commissarypwa/batch-review/page.tsx`

**Behavior (identical)**:
- List of scanned items with quantity controls (+/-)
- Stock exceeded warning for check-out operations
- Submit all button with confirmation modal
- Progress indicator during submission
- Partial failure handling (remove succeeded items, highlight failed)
- Offline warning banner
- Back button to scan screen

**RN differences**:
- `<FlatList>` for batch items instead of mapped `<div>`
- Quantity controls: `<Pressable>` with `expo-haptics` feedback
- No tab bar visible (stack screen within `(app)`)
- `router.back()` for back navigation

#### 5. History Screen

**PWA source**: `commissarypwa/history/page.tsx`

**Behavior (identical)**:
- Search input for filtering by item name
- Filter controls: transaction type, date range
- Grouped by date (Today, Yesterday, date string)
- Transaction detail modal on tap
- Load more pagination
- Sync status and transaction type badges

**RN differences**:
- `<SectionList>` for date-grouped transactions (instead of manual grouping in JSX)
- Filter panel as collapsible `<Animated.View>` instead of toggled `<div>`
- `<Modal>` for transaction detail instead of web modal
- Paginated loading via `onEndReached` (infinite scroll) instead of "Load More" button
- Domain-specific query via `useDomain().config.transactionsTable`

#### 6. Profile Screen

**PWA source**: `commissarypwa/profile/page.tsx`

**Behavior (identical)**:
- User avatar, name, employee ID
- Dark mode toggle
- Sync status display (last synced time, pending count)
- Logout button with confirmation modal
- App version display

**RN additions**:
- **"Switch Domain" button**: Opens domain picker or confirmation dialog
- Domain indicator showing current domain name and icon
- Camera access for avatar (placeholder - same as web)

**RN differences**:
- Dark mode toggle uses `Appearance.setColorScheme()` or `useColorScheme()` + MMKV persistence
- No `<Link>` components - use `router.push()` for navigation
- `Alert.alert()` could replace logout confirmation modal (simpler on mobile)

#### 7. Domain Picker (RN-only)

**New screen**:
- Two large branded cards: Commissary (orange, ChefHat icon) and Frozen Goods (blue, Snowflake icon)
- PackTrack logo/header at top
- Tapping a card sets domain and navigates to home
- Shown on first launch or when switching domains from Profile

---

## 10. Dependencies

### Core Framework

| Package | Version | Purpose |
|---------|---------|---------|
| `expo` | `~52.0.0` | Expo managed workflow |
| `expo-router` | `~4.0.0` | File-based routing |
| `react` | `18.3.1` | UI framework |
| `react-native` | `0.76.x` | Native runtime |
| `typescript` | `~5.3.0` | Type safety |

### Styling

| Package | Version | Purpose |
|---------|---------|---------|
| `nativewind` | `^4.1.0` | Tailwind CSS for RN |
| `tailwindcss` | `^3.4.0` | Tailwind engine |
| `expo-linear-gradient` | `~14.0.0` | Gradient backgrounds |

### Data & Storage

| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | `^2.45.0` | Supabase client |
| `expo-sqlite` | `~15.0.0` | Local SQLite database |
| `react-native-mmkv` | `^3.1.0` | Fast key-value storage |
| `react-native-url-polyfill` | `^2.0.0` | URL polyfill for Supabase |

### Native Features

| Package | Version | Purpose |
|---------|---------|---------|
| `expo-camera` | `~16.0.0` | Barcode scanning |
| `expo-haptics` | `~14.0.0` | Haptic feedback |
| `expo-av` | `~15.0.0` | Scan success audio |
| `expo-crypto` | `~14.0.0` | UUID generation |
| `expo-file-system` | `~18.0.0` | Image file storage |
| `expo-image-picker` | `~16.0.0` | Avatar photo picker |
| `expo-splash-screen` | `~0.29.0` | Splash screen control |
| `expo-font` | `~13.0.0` | Custom font loading |
| `expo-secure-store` | `~14.0.0` | Secure storage fallback |
| `expo-background-fetch` | `~13.0.0` | Background sync |
| `expo-task-manager` | `~12.0.0` | Background task registration |

### Networking

| Package | Version | Purpose |
|---------|---------|---------|
| `@react-native-community/netinfo` | `^11.4.0` | Network status detection |

### UI Components

| Package | Version | Purpose |
|---------|---------|---------|
| `lucide-react-native` | `^0.468.0` | Icon library (matches web) |
| `react-native-toast-message` | `^2.2.0` | Toast notifications |
| `react-native-safe-area-context` | `^4.12.0` | Safe area insets |
| `react-native-screens` | `~4.4.0` | Native screen containers |
| `react-native-reanimated` | `~3.16.0` | Animations |
| `react-native-gesture-handler` | `~2.20.0` | Touch gestures |
| `expo-status-bar` | `~2.0.0` | Status bar control |

### Development & Testing

| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | `^2.1.0` | Unit test runner |
| `@testing-library/react-native` | `^12.8.0` | Component testing |
| `jest-expo` | `~52.0.0` | Jest preset for Expo |
| `maestro` | CLI tool | E2E testing (external) |

### Build & Distribution

| Package | Version | Purpose |
|---------|---------|---------|
| `eas-cli` | Global | EAS Build/Submit CLI |

---

## 11. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal**: Skeleton app with auth, navigation, and basic screens rendering.

| Task | Details |
|------|---------|
| Initialize Expo project | `npx create-expo-app mobile --template tabs` |
| Configure NativeWind | Install, configure `tailwind.config.ts`, add tokens |
| Set up path aliases | `@/` → `./` in `tsconfig.json` |
| Load custom fonts | Poppins family via `expo-font` |
| Create MMKV storage | Storage instance + typed helpers |
| Create Supabase client | MMKV storage adapter, env vars |
| Implement AuthContext | Port from web, add `signIn` method |
| Implement DomainContext | Domain switching with MMKV persistence |
| Set up Expo Router | File-based routes matching screen map |
| Create auth flow | Login → domain-picker → home redirect logic |
| Build Login screen | Port from CM/FG login pages |
| Build Domain Picker | New screen with branded cards |

**Milestone**: User can log in, pick a domain, see empty home screen.

### Phase 2: Component Library (Week 3-4)

**Goal**: Full design system components ready for screen composition.

| Task | Details |
|------|---------|
| Button component | All 7 variants, loading, icon support |
| Card component | 5 variants with NativeWind styling |
| Input component | 3 variants, error state, icons |
| Badge component | All color schemes and sizes |
| Alert component | 4 statuses, 4 variants |
| Modal component | RN Modal with header/body/footer |
| Avatar component | Initials fallback, image support |
| Spinner, Skeleton | Loading state components |
| Switch, Select | Form controls |
| SearchInput | Input with search icon + clear button |
| Divider, Progress | Utility components |
| Toast setup | react-native-toast-message configuration |
| TransactionTypeBadge | Port from web StatusIndicators |
| SyncStatusIndicator | Port from web StatusIndicators |
| ConnectionStatusBar | Online/offline top banner |
| MobileHeader | Port from web MobileLayout |

**Milestone**: All 20+ components built and visually verified.

### Phase 3: Offline Data Layer (Week 5-6)

**Goal**: SQLite database, queue operations, and sync engine working.

| Task | Details |
|------|---------|
| SQLite schema | Create all 7 tables with migrations |
| Transaction queue ops | addToQueue, getQueued, remove, retry |
| Items cache ops | cacheItems, getCached, getByBarcode |
| Item edit/create/archive queues | Full CRUD for all queues |
| Pending images ops | File-based storage instead of blobs |
| Categories cache ops | Cache and retrieve |
| useOnlineStatus hook | Port using @react-native-community/netinfo |
| useSyncQueue hook | Port with direct Supabase RPC calls |
| useSyncErrorCount hook | Port for failed sync count |
| Background sync | expo-background-fetch registration |
| Domain-aware queries | Supabase queries using DomainContext config |
| Items cache refresh | Fetch and cache items on app start / domain switch |

**Milestone**: Transactions can be queued offline, synced when online, retried on failure.

### Phase 4: Screen Implementation (Week 7-9)

**Goal**: All 6+1 screens fully functional.

| Task | Details |
|------|---------|
| Home screen | Welcome card, stats, action buttons, recent activity |
| BatchScanContext | Direct port from web |
| Scan screen (camera mode) | expo-camera barcode scanning, haptic feedback |
| Scan screen (manual mode) | Search autocomplete, recent items |
| ScanSuccessOverlay | Visual + haptic + audio feedback |
| Batch Review screen | Quantity controls, submit, partial failure handling |
| History screen | SectionList, filters, detail modal, pagination |
| Profile screen | User info, dark mode, domain switch, logout |
| Scan feedback hook | useScanFeedback with expo-haptics + expo-av |
| Domain picker polish | Animations, proper branding |

**Milestone**: Full app functional with all screens, offline-capable.

### Phase 5: Polish & Testing (Week 10-12)

**Goal**: Production-ready APK with full test coverage.

| Task | Details |
|------|---------|
| Unit tests | Vitest for hooks, contexts, utils |
| Component tests | @testing-library/react-native for all components |
| E2E tests (Maestro) | Login, scan, submit, offline scenarios |
| Offline scenario testing | Kill network mid-sync, queue overflow, stale cache |
| Performance optimization | FlatList optimization, memo, image caching |
| Error boundaries | Catch and display crashes gracefully |
| Splash screen | Branded splash with `expo-splash-screen` |
| App icon & metadata | Icon, adaptive icon, app name for `app.json` |
| EAS Build setup | `eas.json` for development, preview, production |
| Build APK | `eas build --platform android --profile production` |
| Dark mode polish | Verify all screens in dark mode |
| Accessibility | Screen reader labels, touch target sizes (44px min) |

**Milestone**: Signed APK ready for distribution.

---

## 12. Testing Strategy

### Unit Tests (Vitest)

**Scope**: Hooks, contexts, utility functions, offline queue operations.

```
hooks/
  useSyncQueue.test.ts       # Queue/dequeue, retry logic, max retries → sync_errors
  useOnlineStatus.test.ts    # Online/offline state transitions
  useScanFeedback.test.ts    # Feedback trigger and clear

contexts/
  AuthContext.test.tsx        # Sign in/out, profile loading, role checks
  DomainContext.test.tsx      # Domain switching, cache clearing, persistence
  BatchScanContext.test.tsx   # Add/remove/increment items, duplicate detection

lib/offline/
  queue.test.ts              # All CRUD operations for all 7 tables
  migrations.test.ts         # Schema creation and upgrade paths

lib/
  utils.test.ts              # formatRelativeTime, formatDateTime
  domain/config.test.ts      # Domain config resolution
```

**Configuration**:
- Runner: Vitest (same as web project for consistency)
- Mocks: `expo-sqlite` mocked with in-memory SQLite, `react-native-mmkv` mocked with Map
- Coverage target: 80%+ for lib/, hooks/, contexts/

### Component Tests (@testing-library/react-native)

**Scope**: UI component behavior and rendering.

```
components/ui/
  Button.test.tsx            # Variants, loading state, disabled, onPress
  Card.test.tsx              # Variants, pressable behavior
  Input.test.tsx             # Variants, error state, onChangeText
  Modal.test.tsx             # Open/close, children rendering
  Badge.test.tsx             # Color schemes, sizes
  Alert.test.tsx             # Status variants

components/batch/
  BatchItemRow.test.tsx      # Quantity controls, remove
  BatchMiniList.test.tsx     # Item display, max visible
  BatchConfirmModal.test.tsx # Confirm/cancel, progress
```

### E2E Tests (Maestro)

**Scope**: Full user flows on real/emulated device.

```yaml
# maestro/flows/

login-flow.yaml:
  - Launch app
  - Verify login screen shows
  - Enter valid credentials
  - Verify domain picker appears (first launch)
  - Select Commissary
  - Verify home screen loads with "Commissary" branding

scan-and-submit.yaml:
  - Navigate to home
  - Tap "IN" button
  - Select "Manual" mode
  - Search for item by name
  - Tap item to add to batch
  - Tap "Done Scanning"
  - Verify batch review shows 1 item
  - Tap "Submit All"
  - Confirm submission
  - Verify redirected to home with success message

offline-queue.yaml:
  - Enable airplane mode
  - Navigate to scan → manual
  - Add item to batch
  - Submit batch
  - Verify offline warning shown
  - Verify pending sync count = 1
  - Disable airplane mode
  - Wait for auto-sync (30s)
  - Verify pending sync count = 0

domain-switch.yaml:
  - Login and select Commissary
  - Verify "C" logo in header
  - Navigate to Profile
  - Tap "Switch Domain"
  - Select "Frozen Goods"
  - Verify "F" logo in header
  - Verify items cache refreshed (different items)

history-filter.yaml:
  - Navigate to History tab
  - Verify transactions load
  - Apply "Check In" filter
  - Verify only check-in transactions shown
  - Apply "Today" date filter
  - Verify date grouping correct
  - Clear filters
  - Verify all transactions shown

logout-flow.yaml:
  - Navigate to Profile
  - Tap "Log Out"
  - Confirm in modal
  - Verify redirected to login screen
  - Verify cannot navigate to app screens
```

### Offline Scenario Testing

| Scenario | Test Method | Expected Behavior |
|----------|------------|-------------------|
| Submit while offline | Maestro + airplane mode | Transaction queued in SQLite, pending count incremented |
| Come back online | Maestro + toggle airplane | Auto-sync fires, queue drained, count → 0 |
| Network drop mid-sync | Vitest mock (abort fetch) | Retry count incremented, transaction stays in queue |
| Max retries exceeded | Vitest mock (3 failures) | Transaction moved to sync_errors table, removed from queue |
| App killed with pending queue | Manual test | On relaunch, queue count restored from SQLite, sync resumes |
| Domain switch with pending queue | Vitest + Maestro | Queue cleared, user warned if items pending |
| Stale items cache | Vitest | Items re-fetched on app foreground / pull-to-refresh |
| Duplicate idempotency key | Vitest | Supabase RPC handles idempotency, no double-count |

---

## Verification Checklist

### 1. All 6 PWA screens mapped

- [x] Login → `(auth)/login`
- [x] Home (Dashboard) → `(app)/(tabs)/index`
- [x] Scan (Camera + Manual) → `(app)/(tabs)/scan`
- [x] Batch Review → `(app)/batch-review`
- [x] History → `(app)/(tabs)/history`
- [x] Profile → `(app)/(tabs)/profile`
- [x] Bonus: Domain Picker → `domain-picker` (new)

### 2. All design tokens from `tailwind.config.ts` included

- [x] Colors: primary (11 shades), secondary (11 shades), accent, cta, foreground (5), background (5), border (4), neutral (13), semantic (4 x 3), parks/domain
- [x] Typography: font families (heading, body, mono), font sizes (display through caption)
- [x] Spacing: all custom values (0.5, 1.5, 2.5, 3.5, 4.5, 18, 22)
- [x] Border radius: button (22.5), card (12), input (8), modal (16)
- [x] Shadows: xs through xl, with iOS/Android platform variants
- [x] Z-index: not needed in RN (handled by render order / elevation)
- [x] Animations: handled by `react-native-reanimated` instead of CSS keyframes

### 3. Offline queue schema matches IndexedDB stores

- [x] `transactionQueue` → `transaction_queue` (id, indexes: by-created, by-item)
- [x] `itemsCache` → `items_cache` (id, indexes: by-sku UNIQUE, by-barcode, by-domain)
- [x] `metadata` → `metadata` (key-value store)
- [x] `itemEditQueue` → `item_edit_queue` (indexes: by-created, by-item, by-status)
- [x] `itemCreateQueue` → `item_create_queue` (indexes: by-created, by-status)
- [x] `itemArchiveQueue` → `item_archive_queue` (indexes: by-created, by-item, by-status)
- [x] `pendingImages` → `pending_images` (indexes: by-status, by-item) - Blob → file path
- [x] `categoriesCache` → `categories_cache`

### 4. Sync engine replicates exact behavior from `useSyncQueue.ts`

- [x] Queue count loaded on mount
- [x] `processTransaction`: calls domain-specific RPC (submit_cm_transaction, submit_fg_transaction, submit_transaction)
- [x] `syncQueue`: guard against concurrent sync, iterate queue in order, stop if offline mid-sync
- [x] Max retries (3): exceeded → insert into sync_errors table, remove from queue
- [x] Auto-sync on reconnect (wasOffline + isOnline + isAuthenticated)
- [x] Periodic sync every 30 seconds when queue > 0
- [x] `queueTransaction`: client-generated UUID for id + idempotencyKey, immediate sync attempt if online
- [x] Domain routing: transaction.domain determines which RPC to call

### 5. All component variants from `src/types/index.ts` accounted for

- [x] Size: xs, sm, md, lg, xl, 2xl
- [x] ButtonVariant: cta, primary, secondary, outline, ghost, danger, link
- [x] InputVariant: outline, filled, flushed
- [x] AlertStatus: info, success, warning, error
- [x] AlertVariant: subtle, solid, left-accent, top-accent
- [x] CardVariant: elevated, outline, filled, spotlight, unstyled
- [x] ModalSize: sm, md, lg, xl, full
- [x] BadgeVariant: solid, subtle, outline
- [x] BadgeColorScheme: primary, secondary, success, warning, error, info, neutral
- [x] StockLevel: critical, low, normal, overstocked
- [x] SyncStatus: synced, syncing, pending, offline, error
- [x] UserRole: admin, employee
- [x] TransactionType: check_in, check_out, transfer, adjustment, write_off, return
