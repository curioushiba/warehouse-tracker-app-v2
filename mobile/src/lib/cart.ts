import type { CachedItem } from './db/types';

export interface CartItem {
  item: CachedItem;
  quantity: number;
  notes: string;
}

export type CartState = Map<string, CartItem>;

export function addToCart(cart: CartState, item: CachedItem): CartState {
  const next = new Map(cart);
  const existing = next.get(item.id);
  if (existing) {
    next.set(item.id, { ...existing, quantity: existing.quantity + 1 });
  } else {
    next.set(item.id, { item, quantity: 1, notes: '' });
  }
  return next;
}

export function removeFromCart(cart: CartState, itemId: string): CartState {
  const next = new Map(cart);
  next.delete(itemId);
  return next;
}

export function updateQuantity(cart: CartState, itemId: string, qty: number): CartState {
  if (qty <= 0) {
    return removeFromCart(cart, itemId);
  }
  const next = new Map(cart);
  const existing = next.get(itemId);
  if (existing) {
    next.set(itemId, { ...existing, quantity: qty });
  }
  return next;
}

export function updateNotes(cart: CartState, itemId: string, notes: string): CartState {
  const next = new Map(cart);
  const existing = next.get(itemId);
  if (existing) {
    next.set(itemId, { ...existing, notes });
  }
  return next;
}

export function getCartItemCount(cart: CartState): number {
  return cart.size;
}

export function getCartTotalQuantity(cart: CartState): number {
  let total = 0;
  for (const entry of cart.values()) {
    total += entry.quantity;
  }
  return total;
}

export function validateQuantity(qty: number, decimals: number): string | null {
  if (isNaN(qty) || qty <= 0) {
    return 'Quantity must be greater than 0';
  }
  if (qty > 9999.999) {
    return 'Quantity cannot exceed 9999.999';
  }
  const parts = String(qty).split('.');
  if (parts.length > 1 && parts[1].length > decimals) {
    return `Maximum ${decimals} decimal place(s) allowed`;
  }
  return null;
}

export interface CartValidationError {
  itemId: string;
  itemName: string;
  error: string;
}

export function validateCart(cart: CartState): CartValidationError[] {
  const errors: CartValidationError[] = [];
  for (const entry of cart.values()) {
    const err = validateQuantity(entry.quantity, entry.item.quantity_decimals);
    if (err) {
      errors.push({ itemId: entry.item.id, itemName: entry.item.name, error: err });
    }
  }
  return errors;
}

export function cartToArray(cart: CartState): CartItem[] {
  return Array.from(cart.values()).sort((a, b) =>
    a.item.name.localeCompare(b.item.name),
  );
}

export function isInCart(cart: CartState, itemId: string): boolean {
  return cart.has(itemId);
}

export function getCartQuantity(cart: CartState, itemId: string): number {
  return cart.get(itemId)?.quantity ?? 0;
}
