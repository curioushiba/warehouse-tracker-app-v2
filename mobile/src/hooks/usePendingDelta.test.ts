import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPendingDeltaManager } from './usePendingDelta';

describe('createPendingDeltaManager', () => {
  let onConfirm: ReturnType<typeof vi.fn>;
  let manager: ReturnType<typeof createPendingDeltaManager>;

  beforeEach(() => {
    onConfirm = vi.fn();
    manager = createPendingDeltaManager({ onConfirm });
  });

  // -- increment / decrement --

  it('should increment delta for a new item', () => {
    const result = manager.increment('item-1');
    expect(result).toBe('ok');
    expect(manager.getState()).toEqual({ activeItemId: 'item-1', delta: 1 });
  });

  it('should decrement delta for a new item', () => {
    const result = manager.decrement('item-1');
    expect(result).toBe('ok');
    expect(manager.getState()).toEqual({ activeItemId: 'item-1', delta: -1 });
  });

  it('should accumulate multiple increments on the same item', () => {
    manager.increment('item-1');
    manager.increment('item-1');
    manager.increment('item-1');
    expect(manager.getState().delta).toBe(3);
  });

  it('should accumulate multiple decrements on the same item', () => {
    manager.decrement('item-1');
    manager.decrement('item-1');
    expect(manager.getState().delta).toBe(-2);
  });

  it('should handle mixed increment/decrement on the same item', () => {
    manager.increment('item-1');
    manager.increment('item-1');
    manager.decrement('item-1');
    expect(manager.getState().delta).toBe(1);
  });

  // -- auto-cancel when delta reaches 0 --

  it('should auto-cancel when net delta reaches 0', () => {
    manager.increment('item-1');
    const result = manager.decrement('item-1');
    expect(result).toBe('auto-cancelled');
    expect(manager.getState()).toEqual({ activeItemId: null, delta: 0 });
  });

  // -- cross-item --

  it('should return needs-resolve when incrementing a different item', () => {
    manager.increment('item-1');
    const result = manager.increment('item-2');
    expect(result).toBe('needs-resolve');
    // State should be unchanged
    expect(manager.getState()).toEqual({ activeItemId: 'item-1', delta: 1 });
  });

  it('should return needs-resolve when decrementing a different item', () => {
    manager.decrement('item-1');
    const result = manager.decrement('item-2');
    expect(result).toBe('needs-resolve');
    expect(manager.getState()).toEqual({ activeItemId: 'item-1', delta: -1 });
  });

  it('should allow increment on a new item after no active item', () => {
    const result = manager.increment('item-1');
    expect(result).toBe('ok');
  });

  // -- confirm --

  it('should call onConfirm with itemId, abs quantity, and check_in for positive delta', () => {
    manager.increment('item-1');
    manager.increment('item-1');
    manager.increment('item-1');
    manager.confirm();

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledWith('item-1', 3, 'check_in');
  });

  it('should call onConfirm with itemId, abs quantity, and check_out for negative delta', () => {
    manager.decrement('item-1');
    manager.decrement('item-1');
    manager.confirm();

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledWith('item-1', 2, 'check_out');
  });

  it('should reset state after confirm', () => {
    manager.increment('item-1');
    manager.confirm();
    expect(manager.getState()).toEqual({ activeItemId: null, delta: 0 });
  });

  it('should no-op on confirm when no active item', () => {
    manager.confirm();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // -- cancel --

  it('should reset state on cancel', () => {
    manager.increment('item-1');
    manager.increment('item-1');
    manager.cancel();
    expect(manager.getState()).toEqual({ activeItemId: null, delta: 0 });
  });

  it('should not call onConfirm on cancel', () => {
    manager.increment('item-1');
    manager.cancel();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // -- hasPending --

  it('should return false for hasPending when no active item', () => {
    expect(manager.hasPending()).toBe(false);
  });

  it('should return true for hasPending when active item with non-zero delta', () => {
    manager.increment('item-1');
    expect(manager.hasPending()).toBe(true);
  });

  it('should return false for hasPending after cancel', () => {
    manager.increment('item-1');
    manager.cancel();
    expect(manager.hasPending()).toBe(false);
  });

  it('should return false for hasPending after confirm', () => {
    manager.increment('item-1');
    manager.confirm();
    expect(manager.hasPending()).toBe(false);
  });

  // -- getDisplayStock --

  it('should return original stock for non-active item', () => {
    manager.increment('item-1');
    expect(manager.getDisplayStock('item-2', 50)).toBe(50);
  });

  it('should return adjusted stock for active item', () => {
    manager.increment('item-1');
    manager.increment('item-1');
    expect(manager.getDisplayStock('item-1', 50)).toBe(52);
  });

  it('should return original stock minus abs delta for decrements', () => {
    manager.decrement('item-1');
    manager.decrement('item-1');
    manager.decrement('item-1');
    expect(manager.getDisplayStock('item-1', 50)).toBe(47);
  });

  it('should return original stock when no active item', () => {
    expect(manager.getDisplayStock('item-1', 100)).toBe(100);
  });
});
