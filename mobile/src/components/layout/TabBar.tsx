import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

export interface TabItem {
  key: string
  label: string
  icon: React.ReactNode
  badge?: number
}

export interface TabBarProps {
  tabs: TabItem[]
  activeTab: string
  onTabPress: (key: string) => void
  testID?: string
}

export function TabBar({ tabs, activeTab, onTabPress, testID }: TabBarProps) {
  return (
    <View testID={testID} style={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab
        return (
          <TouchableOpacity
            key={tab.key}
            testID={testID ? `${testID}-tab-${tab.key}` : undefined}
            style={styles.tab}
            onPress={() => onTabPress(tab.key)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              {tab.icon}
              {tab.badge != null && tab.badge > 0 && (
                <View
                  testID={testID ? `${testID}-tab-${tab.key}-badge` : undefined}
                  style={styles.badge}
                >
                  <Text style={styles.badgeText}>{tab.badge}</Text>
                </View>
              )}
            </View>
            <Text
              testID={testID ? `${testID}-tab-${tab.key}-label` : undefined}
              style={{
                fontSize: 11,
                fontWeight: isActive ? '600' : '400',
                color: isActive ? '#01722f' : '#9ca3af',
                marginTop: 2,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingBottom: 4,
    paddingTop: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
})
