import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter, Redirect } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import Toast from 'react-native-toast-message'

export default function LoginScreen() {
  const { isAuthenticated, isLoading: authLoading, signIn } = useAuth()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isFormValid = email.trim().length > 0 && password.trim().length > 0

  const handleSignIn = useCallback(async () => {
    if (!isFormValid || isSubmitting) return

    setIsSubmitting(true)
    try {
      const result = await signIn(email.trim(), password)
      if (result.error) {
        Toast.show({
          type: 'error',
          text1: result.error,
        })
      } else {
        router.replace('/domain-picker')
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [email, password, isFormValid, isSubmitting, signIn, router])

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
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            testID="email-input"
          />

          <View style={styles.spacer} />

          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            testID="password-input"
          />

          <View style={styles.buttonSpacer} />

          <Button
            label="Sign In"
            onPress={handleSignIn}
            disabled={!isFormValid || isSubmitting}
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
