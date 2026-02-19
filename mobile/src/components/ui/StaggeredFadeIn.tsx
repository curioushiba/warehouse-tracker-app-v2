import React from 'react'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { STAGGER_DELAY, STAGGER_MAX_DELAY } from '@/theme/animations'

interface StaggeredFadeInProps {
  index: number
  children: React.ReactNode
  testID?: string
}

export function StaggeredFadeIn({ index, children, testID }: StaggeredFadeInProps) {
  const delay = Math.min(index * STAGGER_DELAY, STAGGER_MAX_DELAY)

  return (
    <Animated.View
      testID={testID}
      entering={FadeInDown.delay(delay).springify()}
    >
      {children}
    </Animated.View>
  )
}
