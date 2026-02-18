import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { DOMAIN_CONFIGS, type DomainId, type DomainConfig } from '@/lib/domain-config'
import {
  getSelectedDomain,
  setSelectedDomain,
  clearSelectedDomain,
} from '@/lib/storage/storage'

// --- Types ---

export interface DomainState {
  domainId: DomainId | null
  domainConfig: DomainConfig | null
}

export interface DomainManager {
  setDomain: (domainId: DomainId) => void
  clearDomain: () => void
  restoreFromStorage: () => Promise<DomainId | null>
}

interface DomainContextValue {
  domainId: DomainId | null
  domainConfig: DomainConfig | null
  setDomain: (domainId: DomainId) => void
  clearDomain: () => void
}

// --- Pure logic (testable) ---

const VALID_DOMAINS: DomainId[] = ['commissary', 'frozen-goods']

function isValidDomainId(value: string): value is DomainId {
  return VALID_DOMAINS.includes(value as DomainId)
}

/**
 * Creates a state manager for domain selection.
 * Exported for direct testing without React rendering.
 *
 * @param setState - Callback to update the state
 */
export function createDomainManager(
  setState: (state: Partial<DomainState>) => void
): DomainManager {
  function setDomain(domainId: DomainId) {
    const config = DOMAIN_CONFIGS[domainId]
    setState({ domainId, domainConfig: config })
    void setSelectedDomain(domainId)
  }

  function clearDomain() {
    setState({ domainId: null, domainConfig: null })
    void clearSelectedDomain()
  }

  async function restoreFromStorage(): Promise<DomainId | null> {
    const stored = await getSelectedDomain()
    if (stored && isValidDomainId(stored)) {
      return stored
    }
    return null
  }

  return {
    setDomain,
    clearDomain,
    restoreFromStorage,
  }
}

// --- React context ---

const DomainContext = createContext<DomainContextValue | undefined>(undefined)

export function DomainProvider({ children }: { children: React.ReactNode }) {
  const [state, setDomainState] = useState<DomainState>({
    domainId: null,
    domainConfig: null,
  })

  const managerRef = useRef<DomainManager | null>(null)
  if (!managerRef.current) {
    managerRef.current = createDomainManager(
      (partial) => setDomainState(prev => ({ ...prev, ...partial }))
    )
  }

  // Restore from storage on mount
  useEffect(() => {
    managerRef.current!.restoreFromStorage().then((stored) => {
      if (stored) {
        managerRef.current!.setDomain(stored)
      }
    })
  }, [])

  const setDomain = useCallback((domainId: DomainId) => {
    managerRef.current?.setDomain(domainId)
  }, [])

  const clearDomain = useCallback(() => {
    managerRef.current?.clearDomain()
  }, [])

  const value = useMemo<DomainContextValue>(() => ({
    domainId: state.domainId,
    domainConfig: state.domainConfig,
    setDomain,
    clearDomain,
  }), [state.domainId, state.domainConfig, setDomain, clearDomain])

  return (
    <DomainContext.Provider value={value}>
      {children}
    </DomainContext.Provider>
  )
}

export function useDomain() {
  const context = useContext(DomainContext)
  if (context === undefined) {
    throw new Error('useDomain must be used within a DomainProvider')
  }
  return context
}
