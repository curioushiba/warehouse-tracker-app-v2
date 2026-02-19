import React, { useState, useCallback, useEffect, useRef } from 'react'
import { View, Text, KeyboardAvoidingView, Platform, StatusBar, TextInput } from 'react-native'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter, Redirect } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/theme'
import { getString, setString } from '@/lib/storage/storage'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'
import { Package, User, Lock, Eye, EyeOff } from 'lucide-react-native'
import Toast from 'react-native-toast-message'

const REMEMBERED_USERNAME_KEY = 'remembered-username'

export default function LoginScreen() {
  const { isAuthenticated, isLoading: authLoading, signIn } = useAuth()
  const router = useRouter()
  const { colors, spacing, typography, radii, isDark, fontFamily } = useTheme()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [usernameLoaded, setUsernameLoaded] = useState(false)

  const usernameRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)

  const isFormValid = username.trim().length > 0 && password.trim().length > 0
  const usernameError = hasAttemptedSubmit && username.trim().length === 0 ? 'Username is required' : undefined
  const passwordError = hasAttemptedSubmit && password.trim().length === 0 ? 'Password is required' : undefined

  // Load remembered username on mount
  useEffect(() => {
    let cancelled = false
    getString(REMEMBERED_USERNAME_KEY).then((saved) => {
      if (cancelled) return
      if (saved) {
        setUsername(saved)
      }
      setUsernameLoaded(true)
    })
    return () => { cancelled = true }
  }, [])

  // Auto-focus after username is loaded
  useEffect(() => {
    if (!usernameLoaded) return
    if (username.trim().length > 0) {
      passwordRef.current?.focus()
    } else {
      usernameRef.current?.focus()
    }
  }, [usernameLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignIn = useCallback(async () => {
    setHasAttemptedSubmit(true)
    if (!isFormValid || isSubmitting) return

    setIsSubmitting(true)
    try {
      const result = await signIn(username.trim(), password)
      if (result.error) {
        Toast.show({
          type: 'error',
          text1: result.error,
        })
      } else {
        // Remember username on successful login
        void setString(REMEMBERED_USERNAME_KEY, username.trim())
        router.replace('/domain-picker')
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Something went wrong. Please check your connection and try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [username, password, isFormValid, isSubmitting, signIn, router])

  if (isAuthenticated && !authLoading) {
    return <Redirect href="/domain-picker" />
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bgSecondary }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top gradient */}
      <LinearGradient
        colors={[`${colors.brandPrimary}0D`, 'transparent']}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 200,
        }}
        testID="login-gradient"
      />

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
        {/* Logo + branding */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={{ alignItems: 'center', marginBottom: spacing[6] }}
        >
          <Package size={56} color={colors.brandPrimary} style={{ marginBottom: spacing[4] }} />
          <Text
            style={{
              ...typography['4xl'],
              fontFamily: fontFamily.heading,
              fontWeight: typography.weight.bold,
              color: colors.brandPrimary,
              marginBottom: spacing[2],
            }}
            testID="login-title"
          >
            PackTrack
          </Text>
          <Text
            style={{
              ...typography.base,
              fontFamily: fontFamily.body,
              color: colors.textTertiary,
            }}
            testID="login-subtitle"
          >
            Warehouse Inventory
          </Text>
        </Animated.View>

        {/* Divider */}
        <View
          style={{
            width: 48,
            height: 1,
            backgroundColor: colors.borderSubtle,
            alignSelf: 'center',
            marginVertical: spacing[6],
          }}
          testID="login-divider"
        />

        {/* Inputs */}
        <Animated.View entering={FadeInUp.delay(200)} style={{ width: '100%' }}>
          <Text
            style={{
              ...typography.sm,
              color: colors.textSecondary,
              marginBottom: spacing[1],
            }}
          >
            Username
          </Text>
          <Input
            ref={usernameRef}
            placeholder="Enter your username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            error={usernameError}
            size="lg"
            leftIcon={<User size={18} color={colors.textTertiary} />}
            testID="username-input"
          />

          <View style={{ height: spacing[4] }} />

          <Text
            style={{
              ...typography.sm,
              color: colors.textSecondary,
              marginBottom: spacing[1],
            }}
          >
            Password
          </Text>
          <Input
            ref={passwordRef}
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            returnKeyType="done"
            onSubmitEditing={handleSignIn}
            error={passwordError}
            size="lg"
            leftIcon={<Lock size={18} color={colors.textTertiary} />}
            rightIcon={
              <AnimatedPressable
                onPress={() => setShowPassword(prev => !prev)}
                testID="password-toggle"
                scaleValue={0.9}
              >
                {showPassword ? (
                  <EyeOff size={20} color={colors.textSecondary} />
                ) : (
                  <Eye size={20} color={colors.textSecondary} />
                )}
              </AnimatedPressable>
            }
            testID="password-input"
          />
        </Animated.View>

        {/* Sign in button */}
        <Animated.View entering={FadeInUp.delay(400)} style={{ marginTop: spacing[6] }}>
          <Button
            label="Sign In"
            onPress={handleSignIn}
            disabled={isSubmitting}
            isLoading={isSubmitting}
            loadingText="Signing in..."
            size="lg"
            testID="sign-in-button"
          />
        </Animated.View>
      </View>

      {/* Version number */}
      <Text
        style={{
          ...typography.xs,
          color: colors.textTertiary,
          textAlign: 'center',
          position: 'absolute',
          bottom: spacing[8],
          left: 0,
          right: 0,
        }}
        testID="login-version"
      >
        v1.0.0
      </Text>
    </KeyboardAvoidingView>
  )
}
