"use client";

import { AdminLayout } from "@/components/layout";
import { usePathname, useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOnlineStatus } from "@/hooks";
import { useSyncQueue } from "@/hooks";
import { useEffect, useState } from "react";
import { getUnreadAlertCount } from "@/lib/actions";

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  "/admin": { title: "Dashboard", subtitle: "Overview of your inventory" },
  "/admin/items": { title: "Items", subtitle: "Manage inventory items" },
  "/admin/categories": { title: "Categories", subtitle: "Organize your inventory" },
  "/admin/locations": { title: "Locations", subtitle: "Manage storage locations" },
  "/admin/transactions": { title: "Transactions", subtitle: "View all movements" },
  "/admin/stock-takes": { title: "Stock Takes", subtitle: "Inventory audits" },
  "/admin/reports": { title: "Reports", subtitle: "Analytics and insights" },
  "/admin/users": { title: "Users", subtitle: "Manage team members" },
  "/admin/settings": { title: "Settings", subtitle: "System configuration" },
  "/admin/notifications": { title: "Notifications", subtitle: "Alerts and updates" },
};

export default function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const pageInfo = pageTitles[pathname || ""] || { title: "Admin" };

  const { profile, signOut, isLoading, isAuthenticated, isAdmin, isEmployee } = useAuthContext();
  const { isOnline } = useOnlineStatus();
  const { queueCount, isSyncing, lastSyncTime } = useSyncQueue();
  const [notificationCount, setNotificationCount] = useState(0);

  // Redirect if not authenticated or not admin
  // Redirect employees to employee portal
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/auth/login");
      } else if (isEmployee && !isAdmin) {
        router.push("/employee");
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, isEmployee, router, pathname]);

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

  // Determine sync status for display
  const displaySyncStatus = isSyncing ? "syncing" : queueCount > 0 ? "pending" : isOnline ? "synced" : "offline";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
