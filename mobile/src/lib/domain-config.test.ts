import { describe, it, expect } from 'vitest'
import { DOMAIN_CONFIGS, type DomainId } from './domain-config'

describe('domain-config', () => {
  describe('Commissary domain', () => {
    const cm = DOMAIN_CONFIGS.commissary

    it('uses cm_items table', () => {
      expect(cm.itemsTable).toBe('cm_items')
    })

    it('uses cm_transactions table', () => {
      expect(cm.transactionsTable).toBe('cm_transactions')
    })

    it('uses submit_cm_transaction RPC', () => {
      expect(cm.rpcSubmitTransaction).toBe('submit_cm_transaction')
    })

    it('has orange brand color', () => {
      expect(cm.brandColor).toBe('#E07A2F')
    })

    it('has letter C', () => {
      expect(cm.letter).toBe('C')
    })

    it('has display name', () => {
      expect(cm.displayName).toBe('Commissary')
    })
  })

  describe('Frozen Goods domain', () => {
    const fg = DOMAIN_CONFIGS['frozen-goods']

    it('uses fg_items table', () => {
      expect(fg.itemsTable).toBe('fg_items')
    })

    it('uses fg_transactions table', () => {
      expect(fg.transactionsTable).toBe('fg_transactions')
    })

    it('uses submit_fg_transaction RPC', () => {
      expect(fg.rpcSubmitTransaction).toBe('submit_fg_transaction')
    })

    it('has blue brand color', () => {
      expect(fg.brandColor).toBe('#2563EB')
    })

    it('has letter F', () => {
      expect(fg.letter).toBe('F')
    })

    it('has display name', () => {
      expect(fg.displayName).toBe('Frozen Goods')
    })
  })

  it('DomainId type covers both domains', () => {
    const ids: DomainId[] = ['commissary', 'frozen-goods']
    expect(ids).toHaveLength(2)
    expect(DOMAIN_CONFIGS[ids[0]]).toBeDefined()
    expect(DOMAIN_CONFIGS[ids[1]]).toBeDefined()
  })
})
