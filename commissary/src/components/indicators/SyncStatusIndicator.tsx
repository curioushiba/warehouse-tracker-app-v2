import React from 'react';
import { View, Text, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { formatRelativeTime } from '@/lib/format';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export interface SyncStatusIndicatorProps {
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: string | null;
}

export function SyncStatusIndicator({
  pendingCount,
  isSyncing,
  lastSyncTime,
}: SyncStatusIndicatorProps) {
  const { colors, spacing, radii, typePresets } = useTheme();

  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  };

  if (isSyncing) {
    return (
      <View
        style={rowStyle}
        accessibilityLiveRegion="polite"
        accessibilityLabel="Syncing in progress"
      >
        <LoadingSpinner size="sm" />
        <Text style={{ ...typePresets.caption, color: colors.textSecondary }}>
          Syncing...
        </Text>
      </View>
    );
  }

  if (pendingCount > 0) {
    return (
      <View
        style={rowStyle}
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${pendingCount} item${pendingCount === 1 ? '' : 's'} pending sync`}
      >
        <View
          style={{
            backgroundColor: colors.warning,
            borderRadius: radii.full,
            minWidth: 20,
            height: 20,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing[1],
          }}
        >
          <Text
            style={{
              ...typePresets.caption,
              color: colors.textInverse,
              fontWeight: '700',
            }}
          >
            {pendingCount}
          </Text>
        </View>
        <Text style={{ ...typePresets.caption, color: colors.warning }}>
          pending
        </Text>
      </View>
    );
  }

  const syncLabel = lastSyncTime
    ? `Synced ${formatRelativeTime(lastSyncTime)}`
    : 'Up to date';

  return (
    <View
      style={rowStyle}
      accessibilityLiveRegion="polite"
      accessibilityLabel={syncLabel}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: radii.full,
          backgroundColor: colors.success,
        }}
      />
      <Text style={{ ...typePresets.caption, color: colors.textSecondary }}>
        {syncLabel}
      </Text>
    </View>
  );
}
