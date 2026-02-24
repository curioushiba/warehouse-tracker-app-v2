export function formatRelativeTime(isoString: string | null): string | null {
  if (!isoString) return null;

  const diffMs = Date.now() - new Date(isoString).getTime();

  if (diffMs < 0 || diffMs < 60_000) return 'Just now';

  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(diffMs / 3_600_000);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(diffMs / 86_400_000);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  return `${Math.floor(days / 7)}w ago`;
}
