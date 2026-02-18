export type DomainId = 'commissary' | 'frozen-goods'

export interface DomainConfig {
  id: DomainId
  displayName: string
  letter: string
  brandColor: string
  itemsTable: 'cm_items' | 'fg_items'
  transactionsTable: 'cm_transactions' | 'fg_transactions'
  rpcSubmitTransaction: 'submit_cm_transaction' | 'submit_fg_transaction'
  /** TransactionDomain value used in the offline queue */
  transactionDomain: 'commissary' | 'frozen-goods'
}

export const DOMAIN_CONFIGS: Record<DomainId, DomainConfig> = {
  commissary: {
    id: 'commissary',
    displayName: 'Commissary',
    letter: 'C',
    brandColor: '#E07A2F',
    itemsTable: 'cm_items',
    transactionsTable: 'cm_transactions',
    rpcSubmitTransaction: 'submit_cm_transaction',
    transactionDomain: 'commissary',
  },
  'frozen-goods': {
    id: 'frozen-goods',
    displayName: 'Frozen Goods',
    letter: 'F',
    brandColor: '#2563EB',
    itemsTable: 'fg_items',
    transactionsTable: 'fg_transactions',
    rpcSubmitTransaction: 'submit_fg_transaction',
    transactionDomain: 'frozen-goods',
  },
}
