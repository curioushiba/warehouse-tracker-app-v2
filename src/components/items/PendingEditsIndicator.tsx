'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Cloud, CloudOff, RefreshCw, Edit3, Image } from 'lucide-react'
import { Badge, Tooltip } from '@/components/ui'
import { useItemEditQueue } from '@/hooks/useItemEditQueue'

interface PendingEditsIndicatorProps {
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export const PendingEditsIndicator: React.FC<PendingEditsIndicatorProps> = ({
  className,
  showLabel = false,
  size = 'md',
}) => {
  const {
    editQueueCount,
    imageQueueCount,
    totalQueueCount,
    isSyncing,
    isOnline,
    lastSyncTime,
    syncQueue,
  } = useItemEditQueue()

  // Don't show if nothing is pending
  if (totalQueueCount === 0 && isOnline) {
    return null
  }

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  const tooltipContent = (
    <div className="space-y-1 text-xs">
      {!isOnline && <p className="font-medium">You are offline</p>}
      {editQueueCount > 0 && (
        <p className="flex items-center gap-1.5">
          <Edit3 className="w-3 h-3" />
          {editQueueCount} pending {editQueueCount === 1 ? 'edit' : 'edits'}
        </p>
      )}
      {imageQueueCount > 0 && (
        <p className="flex items-center gap-1.5">
          <Image className="w-3 h-3" />
          {imageQueueCount} pending {imageQueueCount === 1 ? 'image' : 'images'}
        </p>
      )}
      {isSyncing && <p className="text-primary">Syncing...</p>}
      {lastSyncTime && isOnline && !isSyncing && (
        <p className="text-foreground-muted">
          Last sync: {new Date(lastSyncTime).toLocaleTimeString()}
        </p>
      )}
    </div>
  )

  const handleClick = () => {
    if (isOnline && totalQueueCount > 0 && !isSyncing) {
      syncQueue()
    }
  }

  return (
    <Tooltip content={tooltipContent}>
      <button
        onClick={handleClick}
        disabled={!isOnline || isSyncing}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors',
          'hover:bg-background-subtle focus:outline-none focus:ring-2 focus:ring-primary/20',
          !isOnline ? 'text-neutral-500' : isSyncing ? 'text-primary' : 'text-warning',
          className
        )}
        aria-label={`${totalQueueCount} pending changes`}
      >
        {!isOnline ? (
          <CloudOff className={iconSize} />
        ) : isSyncing ? (
          <RefreshCw className={cn(iconSize, 'animate-spin')} />
        ) : (
          <Cloud className={iconSize} />
        )}

        {totalQueueCount > 0 && (
          <Badge
            colorScheme={!isOnline ? 'neutral' : 'warning'}
            variant="solid"
            size="sm"
          >
            {totalQueueCount}
          </Badge>
        )}

        {showLabel && (
          <span className={cn(textSize, 'font-medium')}>
            {!isOnline
              ? 'Offline'
              : isSyncing
              ? 'Syncing...'
              : `${totalQueueCount} pending`}
          </span>
        )}
      </button>
    </Tooltip>
  )
}

export default PendingEditsIndicator
