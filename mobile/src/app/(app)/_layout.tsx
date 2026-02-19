import React, { useEffect } from 'react'
import { Stack, Redirect } from 'expo-router'
import { SQLiteProvider } from 'expo-sqlite'
import * as BackgroundFetch from 'expo-background-fetch'
import * as TaskManager from 'expo-task-manager'
import { useAuth } from '@/contexts/AuthContext'
import { useDomain } from '@/contexts/DomainContext'
import { BatchScanProvider } from '@/contexts/BatchScanContext'
import { useDeviceType } from '@/hooks/useDeviceType'
import { BACKGROUND_SYNC_TASK } from '@/lib/sync/backgroundTask'
import { BACKGROUND_FETCH_INTERVAL } from '@/lib/constants'

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth()
  const { domainId } = useDomain()
  const _deviceType = useDeviceType() // TODO: use for tablet sidebar layout

  // Register/unregister background sync task
  useEffect(() => {
    async function registerBackgroundFetch() {
      try {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
          minimumInterval: BACKGROUND_FETCH_INTERVAL,
          stopOnTerminate: false,
          startOnBoot: true,
        })
      } catch {
        // Background fetch not available (e.g. simulator)
      }
    }

    registerBackgroundFetch()

    return () => {
      BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK).catch(() => {})
    }
  }, [])

  if (isLoading) return null
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />
  if (!domainId) return <Redirect href="/domain-picker" />

  return (
    <SQLiteProvider databaseName="packtrack.db">
      <BatchScanProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 250,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        </Stack>
      </BatchScanProvider>
    </SQLiteProvider>
  )
}
