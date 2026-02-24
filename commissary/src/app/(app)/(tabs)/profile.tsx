import React, { useCallback } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  UserCircle,
  RefreshCw,
  LogOut,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { screenColors } from '@/theme/tokens';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { SyncStatusIndicator } from '@/components/indicators/SyncStatusIndicator';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { haptic } from '@/lib/haptics';

type DarkMode = 'light' | 'dark' | 'system';

const DARK_MODE_OPTIONS: { value: DarkMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function ProfileScreen() {
  const { colors, spacing, typePresets, radii } = useTheme();
  const { user, profile, signOut } = useAuth();
  const { settings, updateSetting } = useSettings();
  const { pendingCount, isSyncing, lastSyncTime, syncNow, refreshCache } =
    useSyncQueue();

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          haptic('medium');
          try {
            await signOut();
            router.replace('/(auth)/login');
          } catch {
            // Error handled by context
          }
        },
      },
    ]);
  }, [signOut]);

  const handleDarkModeChange = useCallback(
    (mode: DarkMode) => {
      haptic('light');
      updateSetting('darkMode', mode);
    },
    [updateSetting],
  );

  const displayName =
    profile?.name ??
    ([profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    (profile?.username ?? 'User'));

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: screenColors.profile }}
      edges={['top']}
    >
      <ScreenHeader title="Profile" headerColor={screenColors.profile} />

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4] }}
      >
        {/* Profile Card */}
        <Card variant="elevated">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[4],
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.primaryLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCircle size={36} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  ...typePresets.title,
                  color: colors.text,
                }}
              >
                {displayName}
              </Text>
              <Text
                style={{
                  ...typePresets.bodySmall,
                  color: colors.textSecondary,
                  marginTop: spacing[1],
                }}
              >
                {user?.email ?? ''}
              </Text>
              <View style={{ marginTop: spacing[2] }}>
                <Badge
                  label={profile?.role ?? 'employee'}
                  variant={profile?.role === 'admin' ? 'info' : 'default'}
                />
              </View>
            </View>
          </View>
        </Card>

        {/* Sync Section */}
        <View>
          <SectionHeader title="Sync" />
          <Card>
            <View style={{ gap: spacing[3] }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <SyncStatusIndicator
                  pendingCount={pendingCount}
                  isSyncing={isSyncing}
                  lastSyncTime={lastSyncTime}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Sync Now"
                    onPress={syncNow}
                    variant="primary"
                    loading={isSyncing}
                    icon={<RefreshCw size={18} color={colors.textInverse} />}
                    size="sm"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Refresh Cache"
                    onPress={refreshCache}
                    variant="secondary"
                    size="sm"
                  />
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* Settings Section */}
        <View>
          <SectionHeader title="Settings" />
          <Card>
            <View style={{ gap: spacing[4] }}>
              {/* Dark Mode */}
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing[3],
                    marginBottom: spacing[2],
                  }}
                >
                  <Moon size={20} color={colors.iconSecondary} />
                  <Text style={{ ...typePresets.body, color: colors.text }}>
                    Appearance
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: spacing[2],
                  }}
                >
                  {DARK_MODE_OPTIONS.map((option) => {
                    const isActive = settings.darkMode === option.value;
                    const IconComp = option.icon;
                    return (
                      <AnimatedPressable
                        key={option.value}
                        onPress={() => handleDarkModeChange(option.value)}
                        hapticPattern="light"
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: spacing[1],
                          paddingVertical: spacing[2],
                          borderRadius: radii.md,
                          backgroundColor: isActive
                            ? colors.primaryLight
                            : colors.surfaceSecondary,
                          borderWidth: isActive ? 1 : 0,
                          borderColor: colors.primary,
                        }}
                      >
                        <IconComp
                          size={16}
                          color={
                            isActive ? colors.primary : colors.textSecondary
                          }
                        />
                        <Text
                          style={{
                            ...typePresets.caption,
                            color: isActive
                              ? colors.primary
                              : colors.textSecondary,
                            fontWeight: isActive ? '600' : 'normal',
                          }}
                        >
                          {option.label}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* Sign Out */}
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="danger"
          icon={<LogOut size={18} color={colors.textInverse} />}
          size="lg"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
