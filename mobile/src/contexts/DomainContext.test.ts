import { describe, it, expect, beforeEach } from 'vitest'
import { DOMAIN_CONFIGS, type DomainId } from '@/lib/domain-config'
import { clearAll, setSelectedDomain } from '@/lib/storage/mmkv'
import {
  createDomainManager,
  type DomainState,
  type DomainManager,
} from './DomainContext'

/**
 * DomainContext is a React context provider wrapping domain selection logic.
 * We test the pure state management logic via createDomainManager().
 */
describe('createDomainManager', () => {
  let state: DomainState
  let setState: (partial: Partial<DomainState>) => void
  let manager: DomainManager

  beforeEach(() => {
    clearAll()
    state = { domainId: null, domainConfig: null }
    setState = (partial) => {
      state = { ...state, ...partial }
    }
    manager = createDomainManager(setState)
  })

  describe('initial state', () => {
    it('has null domain before selection', () => {
      expect(state.domainId).toBeNull()
      expect(state.domainConfig).toBeNull()
    })
  })

  describe('setDomain', () => {
    it('sets commissary domain', () => {
      manager.setDomain('commissary')
      expect(state.domainId).toBe('commissary')
      expect(state.domainConfig).toEqual(DOMAIN_CONFIGS.commissary)
    })

    it('sets frozen-goods domain', () => {
      manager.setDomain('frozen-goods')
      expect(state.domainId).toBe('frozen-goods')
      expect(state.domainConfig).toEqual(DOMAIN_CONFIGS['frozen-goods'])
    })

    it('stores domain in MMKV', () => {
      manager.setDomain('commissary')
      // Verify by restoring from storage
      const fresh = createDomainManager(setState)
      const restored = fresh.restoreFromStorage()
      expect(restored).toBe('commissary')
    })

    it('returns correct DomainConfig for commissary', () => {
      manager.setDomain('commissary')
      expect(state.domainConfig!.itemsTable).toBe('cm_items')
      expect(state.domainConfig!.transactionsTable).toBe('cm_transactions')
      expect(state.domainConfig!.rpcSubmitTransaction).toBe('submit_cm_transaction')
      expect(state.domainConfig!.displayName).toBe('Commissary')
      expect(state.domainConfig!.brandColor).toBe('#E07A2F')
      expect(state.domainConfig!.letter).toBe('C')
    })

    it('returns correct DomainConfig for frozen-goods', () => {
      manager.setDomain('frozen-goods')
      expect(state.domainConfig!.itemsTable).toBe('fg_items')
      expect(state.domainConfig!.transactionsTable).toBe('fg_transactions')
      expect(state.domainConfig!.rpcSubmitTransaction).toBe('submit_fg_transaction')
      expect(state.domainConfig!.displayName).toBe('Frozen Goods')
      expect(state.domainConfig!.brandColor).toBe('#2563EB')
      expect(state.domainConfig!.letter).toBe('F')
    })
  })

  describe('restoreFromStorage', () => {
    it('returns null when no domain stored', () => {
      const result = manager.restoreFromStorage()
      expect(result).toBeNull()
    })

    it('restores commissary from MMKV', () => {
      manager.setDomain('commissary')

      // Create a fresh manager and restore
      const state2: DomainState = { domainId: null, domainConfig: null }
      const setState2 = (partial: Partial<DomainState>) => {
        Object.assign(state2, partial)
      }
      const manager2 = createDomainManager(setState2)
      const restored = manager2.restoreFromStorage()
      expect(restored).toBe('commissary')
    })

    it('restores frozen-goods from MMKV', () => {
      manager.setDomain('frozen-goods')

      const state2: DomainState = { domainId: null, domainConfig: null }
      const setState2 = (partial: Partial<DomainState>) => {
        Object.assign(state2, partial)
      }
      const manager2 = createDomainManager(setState2)
      const restored = manager2.restoreFromStorage()
      expect(restored).toBe('frozen-goods')
    })

    it('returns null for invalid stored domain', () => {
      // Manually store an invalid domain directly via the imported function
      setSelectedDomain('invalid-domain')

      const result = manager.restoreFromStorage()
      expect(result).toBeNull()
    })
  })

  describe('clearDomain', () => {
    it('resets domain to null', () => {
      manager.setDomain('commissary')
      expect(state.domainId).toBe('commissary')

      manager.clearDomain()
      expect(state.domainId).toBeNull()
      expect(state.domainConfig).toBeNull()
    })

    it('clears from MMKV storage', () => {
      manager.setDomain('commissary')
      manager.clearDomain()

      const restored = manager.restoreFromStorage()
      expect(restored).toBeNull()
    })
  })
})
