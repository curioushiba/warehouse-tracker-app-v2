import { useCallback, useRef, useState } from 'react';

export interface PendingDeltaState {
  activeItemId: string | null;
  delta: number;
}

export type DeltaResult = 'ok' | 'needs-resolve' | 'auto-cancelled';

export interface PendingDeltaManager {
  increment: (itemId: string) => DeltaResult;
  decrement: (itemId: string) => DeltaResult;
  confirm: () => void;
  cancel: () => void;
  hasPending: () => boolean;
  getDisplayStock: (itemId: string, originalStock: number) => number;
  getState: () => PendingDeltaState;
}

/**
 * Pure-logic factory for pending delta management.
 * State is held internally; call getState() to read it.
 */
export function createPendingDeltaManager(deps: {
  onConfirm: (itemId: string, quantity: number, type: 'check_in' | 'check_out') => void;
}): PendingDeltaManager {
  let state: PendingDeltaState = { activeItemId: null, delta: 0 };

  function applyDelta(itemId: string, change: number): DeltaResult {
    if (state.activeItemId === null) {
      state = { activeItemId: itemId, delta: change };
      return 'ok';
    }

    if (state.activeItemId !== itemId) {
      return 'needs-resolve';
    }

    const newDelta = state.delta + change;
    if (newDelta === 0) {
      state = { activeItemId: null, delta: 0 };
      return 'auto-cancelled';
    }

    state = { activeItemId: itemId, delta: newDelta };
    return 'ok';
  }

  return {
    increment(itemId: string): DeltaResult {
      return applyDelta(itemId, 1);
    },

    decrement(itemId: string): DeltaResult {
      return applyDelta(itemId, -1);
    },

    confirm(): void {
      if (state.activeItemId === null || state.delta === 0) return;
      const type = state.delta > 0 ? 'check_in' : 'check_out';
      deps.onConfirm(state.activeItemId, Math.abs(state.delta), type);
      state = { activeItemId: null, delta: 0 };
    },

    cancel(): void {
      state = { activeItemId: null, delta: 0 };
    },

    hasPending(): boolean {
      return state.activeItemId !== null && state.delta !== 0;
    },

    getDisplayStock(itemId: string, originalStock: number): number {
      if (state.activeItemId === itemId) {
        return originalStock + state.delta;
      }
      return originalStock;
    },

    getState(): PendingDeltaState {
      return { ...state };
    },
  };
}

/**
 * React hook wrapping createPendingDeltaManager with reactive state updates.
 */
export function usePendingDelta(
  onConfirm: (itemId: string, quantity: number, type: 'check_in' | 'check_out') => void,
) {
  const [state, setState] = useState<PendingDeltaState>({ activeItemId: null, delta: 0 });

  const managerRef = useRef<PendingDeltaManager | null>(null);
  if (!managerRef.current) {
    managerRef.current = createPendingDeltaManager({ onConfirm });
  }

  const syncState = useCallback(() => {
    if (managerRef.current) {
      setState(managerRef.current.getState());
    }
  }, []);

  const increment = useCallback(
    (itemId: string): DeltaResult => {
      const result = managerRef.current!.increment(itemId);
      syncState();
      return result;
    },
    [syncState],
  );

  const decrement = useCallback(
    (itemId: string): DeltaResult => {
      const result = managerRef.current!.decrement(itemId);
      syncState();
      return result;
    },
    [syncState],
  );

  const confirm = useCallback(() => {
    managerRef.current!.confirm();
    syncState();
  }, [syncState]);

  const cancel = useCallback(() => {
    managerRef.current!.cancel();
    syncState();
  }, [syncState]);

  const hasPending = useCallback((): boolean => {
    return managerRef.current!.hasPending();
  }, []);

  const getDisplayStock = useCallback((itemId: string, originalStock: number): number => {
    return managerRef.current!.getDisplayStock(itemId, originalStock);
  }, []);

  return {
    activeItemId: state.activeItemId,
    delta: state.delta,
    increment,
    decrement,
    confirm,
    cancel,
    hasPending,
    getDisplayStock,
  };
}
