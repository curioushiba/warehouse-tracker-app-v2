import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatRelativeTime } from './format';

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-21T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return null for null input', () => {
    expect(formatRelativeTime(null)).toBeNull();
  });

  it('should return null for empty string input', () => {
    expect(formatRelativeTime('')).toBeNull();
  });

  it('should return "Just now" for timestamps less than 60 seconds ago', () => {
    const thirtySecsAgo = new Date(Date.now() - 30_000).toISOString();
    expect(formatRelativeTime(thirtySecsAgo)).toBe('Just now');
  });

  it('should return "Just now" for future timestamps', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(formatRelativeTime(future)).toBe('Just now');
  });

  it('should return "Xm ago" for minutes', () => {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatRelativeTime(fiveMinsAgo)).toBe('5m ago');
  });

  it('should return "59m ago" just under 1 hour', () => {
    const fiftyNineMinsAgo = new Date(Date.now() - 59 * 60_000).toISOString();
    expect(formatRelativeTime(fiftyNineMinsAgo)).toBe('59m ago');
  });

  it('should return "Xh ago" for hours', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3_600_000).toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
  });

  it('should return "Yesterday" for 24-47 hours ago', () => {
    const oneDayAgo = new Date(Date.now() - 30 * 3_600_000).toISOString();
    expect(formatRelativeTime(oneDayAgo)).toBe('Yesterday');
  });

  it('should return "Xd ago" for 2-6 days', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
    expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago');
  });

  it('should return "6d ago" for exactly 6 days', () => {
    const sixDaysAgo = new Date(Date.now() - 6 * 86_400_000).toISOString();
    expect(formatRelativeTime(sixDaysAgo)).toBe('6d ago');
  });

  it('should return "1w ago" for 7 days', () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    expect(formatRelativeTime(sevenDaysAgo)).toBe('1w ago');
  });

  it('should return "3w ago" for 21 days', () => {
    const twentyOneDaysAgo = new Date(Date.now() - 21 * 86_400_000).toISOString();
    expect(formatRelativeTime(twentyOneDaysAgo)).toBe('3w ago');
  });
});
