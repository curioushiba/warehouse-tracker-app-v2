import React, { useState, useEffect } from 'react'
import { View, Text } from 'react-native'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { useRouter, Redirect } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { useDomain } from '@/contexts/DomainContext'
import { useTheme, CARD_PRESS } from '@/theme'
import { getSelectedDomain } from '@/lib/storage/storage'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'
import { Button } from '@/components/ui/Button'
import { ChevronRight } from 'lucide-react-native'
import type { DomainId } from '@/lib/domain-config'

interface DomainOption {
  id: DomainId
  displayName: string
  letter: string
  brandColor: string
  description: string
}

const DOMAINS: DomainOption[] = [
  { id: 'commissary', displayName: 'Commissary', letter: 'C', brandColor: '#E07A2F', description: 'Fresh & dry goods' },
  { id: 'frozen-goods', displayName: 'Frozen Goods', letter: 'F', brandColor: '#2563EB', description: 'Frozen inventory' },
]

const DOMAIN_NAMES: Record<string, string> = {
  commissary: 'Commissary',
  'frozen-goods': 'Frozen Goods',
}

const DOMAIN_LETTERS: Record<string, { letter: string; color: string }> = {
  commissary: { letter: 'C', color: '#E07A2F' },
  'frozen-goods': { letter: 'F', color: '#2563EB' },
}

export default function DomainPickerScreen() {
  const { isAuthenticated, isLoading, signOut } = useAuth()
  const { domainId, setDomain } = useDomain()
  const router = useRouter()
  const { colors, spacing, typography, shadows, radii, fontFamily } = useTheme()

  const [lastDomain, setLastDomain] = useState<string | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    getSelectedDomain().then((saved) => {
      if (!cancelled && saved) {
        setLastDomain(saved)
      }
    })
    return () => { cancelled = true }
  }, [])

  if (!isAuthenticated && !isLoading) {
    return <Redirect href="/(auth)/login" />
  }

  const handleSelectDomain = (id: DomainId) => {
    setDomain(id)
    router.replace('/(app)/(tabs)')
  }

  const handleQuickResume = () => {
    if (lastDomain) {
      handleSelectDomain(lastDomain as DomainId)
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgSecondary,
        paddingHorizontal: spacing[6],
        justifyContent: 'center',
      }}
    >
      {/* Title */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={{ alignItems: 'center', marginBottom: spacing[10] }}
      >
        <Text
          style={{
            ...typography['3xl'],
            fontFamily: fontFamily.heading,
            fontWeight: typography.weight.bold,
            color: colors.textPrimary,
            marginBottom: spacing[2],
          }}
          testID="domain-picker-title"
        >
          Select Domain
        </Text>
        <Text
          style={{
            ...typography.lg,
            fontFamily: fontFamily.body,
            color: colors.textSecondary,
          }}
        >
          Choose the inventory domain to manage
        </Text>
      </Animated.View>

      {/* Quick resume row */}
      {lastDomain && (
        <Animated.View entering={FadeInUp.delay(100)} style={{ marginBottom: spacing[6] }}>
          <AnimatedPressable
            testID="quick-resume-button"
            onPress={handleQuickResume}
            scaleValue={CARD_PRESS.toValue}
            hapticPattern="light"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surfacePrimary,
              borderRadius: radii.xl,
              padding: spacing[4],
              ...shadows.sm,
            }}
          >
            {/* Domain letter badge */}
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: DOMAIN_LETTERS[lastDomain]?.color ?? colors.brandPrimary,
                marginRight: spacing[3],
              }}
            >
              <Text
                style={{
                  ...typography.lg,
                  fontWeight: typography.weight.bold,
                  color: colors.textInverse,
                }}
              >
                {DOMAIN_LETTERS[lastDomain]?.letter ?? '?'}
              </Text>
            </View>
            <Text
              style={{
                flex: 1,
                ...typography.base,
                fontWeight: typography.weight.medium,
                color: colors.textPrimary,
              }}
            >
              Continue to {DOMAIN_NAMES[lastDomain] ?? lastDomain}
            </Text>
            <ChevronRight size={20} color={colors.textTertiary} />
          </AnimatedPressable>
        </Animated.View>
      )}

      {/* Side-by-side domain cards */}
      <Animated.View
        entering={FadeInUp.delay(200)}
        style={{ flexDirection: 'row', gap: spacing[4] }}
      >
        {DOMAINS.map((domain, index) => {
          const isSelected = domainId === domain.id
          return (
            <AnimatedPressable
              key={domain.id}
              testID={`domain-card-${domain.id}`}
              onPress={() => handleSelectDomain(domain.id)}
              scaleValue={CARD_PRESS.toValue}
              hapticPattern="light"
              style={{
                flex: 1,
                aspectRatio: 1 / 1.2,
                borderRadius: radii.xl,
                padding: spacing[4],
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surfacePrimary,
                borderColor: domain.brandColor,
                borderWidth: isSelected ? 3 : 2,
                ...shadows.md,
              }}
            >
              {/* Large letter circle */}
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing[3],
                  backgroundColor: domain.brandColor,
                }}
              >
                <Text
                  style={{
                    ...typography['2xl'],
                    fontWeight: typography.weight.bold,
                    color: colors.textInverse,
                  }}
                >
                  {domain.letter}
                </Text>
              </View>
              <Text
                style={{
                  ...typography.lg,
                  fontFamily: fontFamily.heading,
                  fontWeight: typography.weight.semibold,
                  color: domain.brandColor,
                  marginBottom: spacing[1],
                }}
              >
                {domain.displayName}
              </Text>
              <Text
                style={{
                  ...typography.sm,
                  color: colors.textTertiary,
                  textAlign: 'center',
                }}
                testID={`domain-desc-${domain.id}`}
              >
                {domain.description}
              </Text>
            </AnimatedPressable>
          )
        })}
      </Animated.View>

      <View style={{ marginTop: spacing[10], alignItems: 'center' }}>
        <Button
          label="Sign Out"
          onPress={signOut}
          variant="ghost"
          size="md"
          testID="sign-out-button"
        />
      </View>
    </View>
  )
}
