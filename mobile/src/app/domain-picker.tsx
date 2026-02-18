import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter, Redirect } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { useDomain } from '@/contexts/DomainContext'
import { Button } from '@/components/ui/Button'
import type { DomainId } from '@/lib/domain-config'

interface DomainOption {
  id: DomainId
  displayName: string
  letter: string
  brandColor: string
}

const DOMAINS: DomainOption[] = [
  { id: 'commissary', displayName: 'Commissary', letter: 'C', brandColor: '#E07A2F' },
  { id: 'frozen-goods', displayName: 'Frozen Goods', letter: 'F', brandColor: '#2563EB' },
]

export default function DomainPickerScreen() {
  const { isAuthenticated, isLoading, signOut } = useAuth()
  const { domainId, setDomain } = useDomain()
  const router = useRouter()

  if (!isAuthenticated && !isLoading) {
    return <Redirect href="/(auth)/login" />
  }

  const handleSelectDomain = (id: DomainId) => {
    setDomain(id)
    router.replace('/(app)/(tabs)')
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Domain</Text>
        <Text style={styles.subtitle}>Choose the inventory domain to manage</Text>
      </View>

      <View style={styles.cardContainer}>
        {DOMAINS.map((domain) => {
          const isSelected = domainId === domain.id
          return (
            <TouchableOpacity
              key={domain.id}
              testID={`domain-card-${domain.id}`}
              style={[
                styles.card,
                {
                  borderColor: domain.brandColor,
                  borderWidth: isSelected ? 3 : 2,
                },
              ]}
              onPress={() => handleSelectDomain(domain.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.letterCircle, { backgroundColor: domain.brandColor }]}>
                <Text style={styles.letterText}>{domain.letter}</Text>
              </View>
              <Text style={[styles.cardTitle, { color: domain.brandColor }]}>
                {domain.displayName}
              </Text>
              {isSelected && (
                <Text style={styles.selectedLabel}>Last Selected</Text>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={styles.footer}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  cardContainer: {
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  letterCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  letterText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  selectedLabel: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
})
