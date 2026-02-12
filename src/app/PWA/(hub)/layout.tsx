"use client";

import { AdminLayout } from "@/components/layout";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOnlineStatus, useSyncQueue, useOfflineItemSync } from "@/hooks";

export default function PWAHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { profile, signOut } = useAuthContext();
  const { isOnline } = useOnlineStatus();
  const { queueCount: transactionQueueCount, isSyncing: isTransactionSyncing } = useSyncQueue();
  const { totalQueueCount: itemQueueCount, isSyncing: isItemSyncing } = useOfflineItemSync();

  const totalQueueCount = transactionQueueCount + itemQueueCount;
  const isSyncing = isTransactionSyncing || isItemSyncing;

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/login");
  };

  const user = profile ? {
    name: `${profile.first_name} ${profile.last_name}`,
    email: profile.email || "",
    avatar: profile.avatar_url || undefined,
    role: profile.role === 'admin' ? 'Admin' : 'Employee',
  } : undefined;

  const displaySyncStatus = isSyncing ? "syncing" : totalQueueCount > 0 ? "pending" : isOnline ? "synced" : "offline";

  return (
    <AdminLayout
      title="PWA Hub"
      subtitle="Manage and discover available PWAs"
      isOnline={isOnline}
      syncStatus={displaySyncStatus}
      user={user}
      onSignOut={handleSignOut}
    >
      {children}
    </AdminLayout>
  );
}
