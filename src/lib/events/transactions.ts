/**
 * Transaction event utilities for cross-component and cross-tab communication.
 * Used to notify dashboard components when transactions are submitted.
 */

const CHANNEL_NAME = 'packtrack-transactions';
const EVENT_NAME = 'packtrack:transaction-submitted';

let broadcastChannel: BroadcastChannel | null = null;

/**
 * Get or create the BroadcastChannel for cross-tab communication.
 * Returns null if running server-side or BroadcastChannel is not supported.
 */
function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!('BroadcastChannel' in window)) return null;
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
  return broadcastChannel;
}

/**
 * Notify all listeners (same-tab and cross-tab) that a transaction was submitted.
 * Call this after a successful transaction sync.
 */
export function notifyTransactionSubmitted(): void {
  if (typeof window === 'undefined') return;

  // Notify other tabs via BroadcastChannel
  const channel = getChannel();
  if (channel) {
    channel.postMessage({ type: 'transaction-submitted', timestamp: Date.now() });
  }

  // Notify same-tab listeners via CustomEvent
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { timestamp: Date.now() } }));
}

/**
 * Subscribe to transaction submitted events (both same-tab and cross-tab).
 * Returns a cleanup function to unsubscribe.
 *
 * @param callback - Function to call when a transaction is submitted
 * @returns Cleanup function to remove event listeners
 */
export function onTransactionSubmitted(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  // Listen for same-tab events
  const handleLocalEvent = () => callback();
  window.addEventListener(EVENT_NAME, handleLocalEvent);

  // Listen for cross-tab events via BroadcastChannel
  const channel = getChannel();
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'transaction-submitted') {
      callback();
    }
  };
  if (channel) {
    channel.addEventListener('message', handleBroadcast);
  }

  // Return cleanup function
  return () => {
    window.removeEventListener(EVENT_NAME, handleLocalEvent);
    if (channel) {
      channel.removeEventListener('message', handleBroadcast);
    }
  };
}
