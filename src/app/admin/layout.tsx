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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1cdebf1c-046d-413a-a7aa-3fb720f110d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/layout.tsx:40',message:'Redirect effect triggered',data:{isLoading,isAuthenticated,isAdmin,isEmployee,pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4,H5'})}).catch(()=>{});
    // #endregion
    if (!isLoading) {
      if (!isAuthenticated) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/1cdebf1c-046d-413a-a7aa-3fb720f110d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/layout.tsx:43',message:'Redirecting to login',data:{reason:'not authenticated'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
        router.push("/auth/login");
      } else if (isEmployee && !isAdmin) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/1cdebf1c-046d-413a-a7aa-3fb720f110d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/layout.tsx:45',message:'Redirecting to employee',data:{reason:'employee not admin'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1cdebf1c-046d-413a-a7aa-3fb720f110d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/layout.tsx:78',message:'Showing loading spinner',data:{isLoading,isAuthenticated,hasProfile:!!profile},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1,H2,H4'})}).catch(()=>{});
    // #endregion
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
