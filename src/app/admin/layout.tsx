"use client";

import { AdminLayout } from "@/components/layout";
import { usePathname, useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOnlineStatus, useSyncQueue, useOfflineItemSync } from "@/hooks";
import { useEffect, useState } from "react";
import { getUnreadAlertCount } from "@/lib/actions";

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  "/admin": { title: "Dashboard", subtitle: "Overview of your inventory" },
  "/admin/items": { title: "Items", subtitle: "Manage inventory items" },
  "/admin/categories": { title: "Categories", subtitle: "Organize your inventory" },
  "/admin/stores": { title: "Stores", subtitle: "Manage your stores" },
  "/admin/locations": { title: "Locations", subtitle: "Manage storage locations" },
  "/admin/transactions": { title: "Transactions", subtitle: "View all movements" },
  "/admin/stock-takes": { title: "Stock Takes", subtitle: "Inventory audits" },
  "/admin/reports": { title: "Reports", subtitle: "Analytics and insights" },
  "/admin/users": { title: "Users", subtitle: "Manage team members" },
  "/admin/settings": { title: "Settings", subtitle: "System configuration" },
  "/admin/notifications": { title: "Notifications", subtitle: "Alerts and updates" },
  "/admin/help": { title: "Help & Support", subtitle: "Documentation and resources" },
  "/admin/sync-errors": { title: "Sync Errors", subtitle: "Failed offline transactions" },
  "/admin/commissary": { title: "Commissary", subtitle: "Production tracking and targets" },
  "/admin/commissary/targets": { title: "Production Targets", subtitle: "Manage daily production goals" },
  "/admin/commissary/production": { title: "Production History", subtitle: "View production log records" },
  "/admin/commissary/analytics": { title: "Production Analytics", subtitle: "Performance metrics and insights" },
};

export default function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const pageInfo = pageTitles[pathname || ""] || { title: "Admin" };

  // Auth + role routing is already enforced in middleware.
  // Avoid blocking initial render on client-side profile fetching.
  const { profile, signOut, isAuthenticated } = useAuthContext();
  const { isOnline } = useOnlineStatus();
  const { queueCount: transactionQueueCount, isSyncing: isTransactionSyncing } = useSyncQueue();
  const { totalQueueCount: itemQueueCount, isSyncing: isItemSyncing } = useOfflineItemSync();
  const [notificationCount, setNotificationCount] = useState(0);

  // Combined queue count and sync status
  const totalQueueCount = transactionQueueCount + itemQueueCount;
  const isSyncing = isTransactionSyncing || isItemSyncing;

  // Fetch notification count
  useEffect(() => {
    const fetchNotifications = async () => {
      const result = await getUnreadAlertCount();
      if (result.success && result.data !== undefined) {
        setNotificationCount(result.data);
      }
    };
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated]);

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

  // Determine sync status for display (using combined counts)
  const displaySyncStatus = isSyncing ? "syncing" : totalQueueCount > 0 ? "pending" : isOnline ? "synced" : "offline";

  return (
    <AdminLayout
      title={pageInfo.title}
      subtitle={pageInfo.subtitle}
      isOnline={isOnline}
      syncStatus={displaySyncStatus}
      notificationCount={notificationCount}
      user={user}
      onSignOut={handleSignOut}
    >
      {children}
    </AdminLayout>
  );
}
