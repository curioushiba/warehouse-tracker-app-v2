import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, Mail, Lock } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginScreen() {
  const { colors, spacing, typePresets } = useTheme();
  const { signIn, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSignIn = useCallback(async () => {
    setLocalError(null);

    if (!email.trim()) {
      setLocalError('Email is required');
      return;
    }
    if (!password) {
      setLocalError('Password is required');
      return;
    }

    try {
      await signIn(email.trim(), password);
      router.replace('/(app)/(tabs)');
    } catch {
      // Error is handled by AuthContext and displayed below
    }
  }, [email, password, signIn]);

  const displayError = localError ?? error;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            padding: spacing[6],
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', marginBottom: spacing[12] }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 20,
                backgroundColor: colors.primaryLight,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing[4],
              }}
            >
              <Package size={40} color={colors.primary} />
            </View>
            <Text style={{ ...typePresets.display, color: colors.text }}>
              PackTrack
            </Text>
            <Text
              style={{
                ...typePresets.body,
                color: colors.textSecondary,
                marginTop: spacing[1],
              }}
            >
              Inventory Management
            </Text>
          </View>

          <View style={{ gap: spacing[4] }}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              icon={<Mail size={20} color={colors.iconSecondary} />}
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              icon={<Lock size={20} color={colors.iconSecondary} />}
            />

            {displayError && (
              <Text
                style={{
                  ...typePresets.bodySmall,
                  color: colors.error,
                  textAlign: 'center',
                }}
              >
                {displayError}
              </Text>
            )}

            <Button
              title="Sign In"
              onPress={handleSignIn}
              loading={loading}
              size="lg"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
