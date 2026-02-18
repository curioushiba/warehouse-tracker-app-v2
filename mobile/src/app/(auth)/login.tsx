import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native'
import { useRouter, Redirect } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Eye, EyeOff } from 'lucide-react-native'
import Toast from 'react-native-toast-message'

export default function LoginScreen() {
  const { isAuthenticated, isLoading: authLoading, signIn } = useAuth()
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  const isFormValid = username.trim().length > 0 && password.trim().length > 0
  const usernameError = hasAttemptedSubmit && username.trim().length === 0 ? 'Username is required' : undefined
  const passwordError = hasAttemptedSubmit && password.trim().length === 0 ? 'Password is required' : undefined

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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>PackTrack</Text>
          <Text style={styles.subtitle}>Warehouse Inventory Management</Text>
        </View>

        <View style={styles.form}>
          <Input
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            error={usernameError}
            testID="username-input"
          />

          <View style={styles.spacer} />

          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            error={passwordError}
            rightIcon={
              <TouchableOpacity
                onPress={() => setShowPassword(prev => !prev)}
                testID="password-toggle"
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                hitSlop={8}
              >
                {showPassword ? <EyeOff size={20} color="#6B7280" /> : <Eye size={20} color="#6B7280" />}
              </TouchableOpacity>
            }
            testID="password-input"
          />

          <View style={styles.buttonSpacer} />

          <Button
            label="Sign In"
            onPress={handleSignIn}
            disabled={isSubmitting}
            isLoading={isSubmitting}
            loadingText="Signing in..."
            size="lg"
            testID="sign-in-button"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#01722f',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    width: '100%',
  },
  spacer: {
    height: 16,
  },
  buttonSpacer: {
    height: 24,
  },
})
