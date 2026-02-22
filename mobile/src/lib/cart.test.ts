import { describe, it, expect } from 'vitest';
import type { CachedItem } from './db/types';
import {
  addToCart,
  removeFromCart,
  updateQuantity,
  updateNotes,
  getCartItemCount,
  getCartTotalQuantity,
  validateQuantity,
  validateCart,
  cartToArray,
  isInCart,
  getCartQuantity,
  type CartState,
} from './cart';

function makeItem(overrides: Partial<CachedItem> = {}): CachedItem {
  return {
    id: 'item-1',
    sku: 'SKU-001',
    name: 'Test Item',
    barcode: 'BC-001',
    current_stock: 100,
    min_stock: 10,
    max_stock: 500,
    unit: 'pcs',
    unit_price: 9.99,
    category_id: 'cat-1',
    category_name: 'Category A',
    quantity_decimals: 3,
    is_archived: false,
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function emptyCart(): CartState {
  return new Map();
}

describe('cart', () => {
  // --- addToCart ---

  describe('addToCart', () => {
    it('should add a new item with quantity 1', () => {
      const cart = addToCart(emptyCart(), makeItem());
      expect(cart.size).toBe(1);
      expect(cart.get('item-1')?.quantity).toBe(1);
      expect(cart.get('item-1')?.notes).toBe('');
    });

    it('should increment quantity when adding existing item', () => {
      let cart = addToCart(emptyCart(), makeItem());
      cart = addToCart(cart, makeItem());
      expect(cart.get('item-1')?.quantity).toBe(2);
    });

    it('should add multiple different items', () => {
      let cart = addToCart(emptyCart(), makeItem({ id: 'a', name: 'Alpha' }));
      cart = addToCart(cart, makeItem({ id: 'b', name: 'Beta' }));
      expect(cart.size).toBe(2);
    });

    it('should not mutate the original cart', () => {
      const original = emptyCart();
      const next = addToCart(original, makeItem());
      expect(original.size).toBe(0);
      expect(next.size).toBe(1);
    });
  });

  // --- removeFromCart ---

  describe('removeFromCart', () => {
    it('should remove an existing item', () => {
      let cart = addToCart(emptyCart(), makeItem());
      cart = removeFromCart(cart, 'item-1');
      expect(cart.size).toBe(0);
    });

    it('should be a no-op for non-existent item', () => {
      const cart = removeFromCart(emptyCart(), 'nonexistent');
      expect(cart.size).toBe(0);
    });

    it('should not mutate the original cart', () => {
      const original = addToCart(emptyCart(), makeItem());
      const next = removeFromCart(original, 'item-1');
      expect(original.size).toBe(1);
      expect(next.size).toBe(0);
    });
  });

  // --- updateQuantity ---

  describe('updateQuantity', () => {
    it('should update quantity for an existing item', () => {
      let cart = addToCart(emptyCart(), makeItem());
      cart = updateQuantity(cart, 'item-1', 5);
      expect(cart.get('item-1')?.quantity).toBe(5);
    });

    it('should remove item when quantity is 0', () => {
      let cart = addToCart(emptyCart(), makeItem());
      cart = updateQuantity(cart, 'item-1', 0);
      expect(cart.size).toBe(0);
    });

    it('should remove item when quantity is negative', () => {
      let cart = addToCart(emptyCart(), makeItem());
      cart = updateQuantity(cart, 'item-1', -1);
      expect(cart.size).toBe(0);
    });

    it('should be a no-op for non-existent item', () => {
      const cart = updateQuantity(emptyCart(), 'nonexistent', 5);
      expect(cart.size).toBe(0);
    });

    it('should support decimal quantities', () => {
      let cart = addToCart(emptyCart(), makeItem());
      cart = updateQuantity(cart, 'item-1', 2.5);
      expect(cart.get('item-1')?.quantity).toBe(2.5);
    });
  });

  // --- updateNotes ---

  describe('updateNotes', () => {
    it('should update notes for an existing item', () => {
      let cart = addToCart(emptyCart(), makeItem());
      cart = updateNotes(cart, 'item-1', 'Fragile');
      expect(cart.get('item-1')?.notes).toBe('Fragile');
    });

    it('should be a no-op for non-existent item', () => {
      const cart = updateNotes(emptyCart(), 'nonexistent', 'note');
      expect(cart.size).toBe(0);
    });

    it('should allow clearing notes', () => {
      let cart = addToCart(emptyCart(), makeItem());
      cart = updateNotes(cart, 'item-1', 'Some note');
      cart = updateNotes(cart, 'item-1', '');
      expect(cart.get('item-1')?.notes).toBe('');
    });
  });

  // --- getCartItemCount ---

  describe('getCartItemCount', () => {
    it('should return 0 for empty cart', () => {
      expect(getCartItemCount(emptyCart())).toBe(0);
    });

    it('should return distinct item count', () => {
      let cart = addToCart(emptyCart(), makeItem({ id: 'a' }));
      cart = addToCart(cart, makeItem({ id: 'b' }));
      cart = addToCart(cart, makeItem({ id: 'a' })); // duplicate
      expect(getCartItemCount(cart)).toBe(2);
    });
  });

  // --- getCartTotalQuantity ---

  describe('getCartTotalQuantity', () => {
    it('should return 0 for empty cart', () => {
      expect(getCartTotalQuantity(emptyCart())).toBe(0);
    });

    it('should sum all quantities', () => {
      let cart = addToCart(emptyCart(), makeItem({ id: 'a' }));
      cart = addToCart(cart, makeItem({ id: 'b' }));
      cart = updateQuantity(cart, 'a', 3);
      cart = updateQuantity(cart, 'b', 7);
      expect(getCartTotalQuantity(cart)).toBe(10);
    });
  });

  // --- validateQuantity ---

  describe('validateQuantity', () => {
    it('should return null for valid integer quantity', () => {
      expect(validateQuantity(5, 0)).toBeNull();
    });

    it('should return null for valid decimal quantity', () => {
      expect(validateQuantity(2.5, 1)).toBeNull();
    });

    it('should return error for 0 quantity', () => {
      expect(validateQuantity(0, 0)).toBe('Quantity must be greater than 0');
    });

    it('should return error for negative quantity', () => {
      expect(validateQuantity(-1, 0)).toBe('Quantity must be greater than 0');
    });

    it('should return error for NaN', () => {
      expect(validateQuantity(NaN, 0)).toBe('Quantity must be greater than 0');
    });

    it('should return error when exceeding max', () => {
      expect(validateQuantity(10000, 0)).toBe('Quantity cannot exceed 9999.999');
    });

    it('should return error for too many decimal places', () => {
      expect(validateQuantity(1.1234, 3)).toBe('Maximum 3 decimal place(s) allowed');
    });

    it('should allow exact decimal places', () => {
      expect(validateQuantity(1.123, 3)).toBeNull();
    });

    it('should allow fewer decimal places', () => {
      expect(validateQuantity(1.1, 3)).toBeNull();
    });
  });

  // --- validateCart ---

  describe('validateCart', () => {
    it('should return empty array for valid cart', () => {
      let cart = addToCart(emptyCart(), makeItem({ id: 'a', quantity_decimals: 0 }));
      cart = updateQuantity(cart, 'a', 5);
      expect(validateCart(cart)).toEqual([]);
    });

    it('should return errors for invalid items', () => {
      let cart = addToCart(emptyCart(), makeItem({ id: 'a', name: 'Item A', quantity_decimals: 0 }));
      cart = updateQuantity(cart, 'a', 1.5); // 0 decimals allowed → error
      const errors = validateCart(cart);
      expect(errors).toHaveLength(1);
      expect(errors[0].itemId).toBe('a');
      expect(errors[0].itemName).toBe('Item A');
    });

    it('should return empty array for empty cart', () => {
      expect(validateCart(emptyCart())).toEqual([]);
    });
  });

  // --- cartToArray ---

  describe('cartToArray', () => {
    it('should return empty array for empty cart', () => {
      expect(cartToArray(emptyCart())).toEqual([]);
    });

    it('should sort items by name', () => {
      let cart = addToCart(emptyCart(), makeItem({ id: 'z', name: 'Zebra' }));
      cart = addToCart(cart, makeItem({ id: 'a', name: 'Apple' }));
      cart = addToCart(cart, makeItem({ id: 'm', name: 'Mango' }));
      const arr = cartToArray(cart);
      expect(arr.map((ci) => ci.item.name)).toEqual(['Apple', 'Mango', 'Zebra']);
    });
  });

  // --- isInCart ---

  describe('isInCart', () => {
    it('should return false for empty cart', () => {
      expect(isInCart(emptyCart(), 'item-1')).toBe(false);
    });

    it('should return true when item is in cart', () => {
      const cart = addToCart(emptyCart(), makeItem());
      expect(isInCart(cart, 'item-1')).toBe(true);
    });

    it('should return false when item is not in cart', () => {
      const cart = addToCart(emptyCart(), makeItem());
      expect(isInCart(cart, 'other')).toBe(false);
    });
  });

  // --- getCartQuantity ---

  describe('getCartQuantity', () => {
    it('should return 0 for item not in cart', () => {
      expect(getCartQuantity(emptyCart(), 'item-1')).toBe(0);
    });

    it('should return the quantity for item in cart', () => {
      let cart = addToCart(emptyCart(), makeItem());
      cart = updateQuantity(cart, 'item-1', 7);
      expect(getCartQuantity(cart, 'item-1')).toBe(7);
    });
  });
});
