import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
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

  if (isSyncing) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <LoadingSpinner size="sm" />
        <Text style={{ ...typePresets.caption, color: colors.textSecondary }}>
          Syncing...
        </Text>
      </View>
    );
  }

  if (pendingCount > 0) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
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

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: radii.full,
          backgroundColor: colors.success,
        }}
      />
      <Text style={{ ...typePresets.caption, color: colors.textSecondary }}>
        {lastSyncTime ? `Synced ${lastSyncTime}` : 'Up to date'}
      </Text>
    </View>
  );
}
