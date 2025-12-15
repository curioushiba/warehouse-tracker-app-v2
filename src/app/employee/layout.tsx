"use client";

import { MobileLayout } from "@/components/layout";
import { usePathname, useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { BatchScanProvider } from "@/contexts/BatchScanContext";
import { useOnlineStatus } from "@/hooks";
import { useSyncQueue } from "@/hooks";
import { useEffect } from "react";

const pageTitles: Record<string, string> = {
  "/employee": "PackTrack",
  "/employee/scan": "Scan Item",
  "/employee/batch-review": "Review Items",
  "/employee/history": "History",
  "/employee/profile": "Profile",
  "/employee/transaction": "Transaction",
  "/employee/login": "Employee Login",
};

export default function EmployeeLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const title = pageTitles[pathname || ""] || "Employee";

  const { isLoading, isAuthenticated, isEmployee, isAdmin } = useAuthContext();
  const { isOnline } = useOnlineStatus();
  const { queueCount, isSyncing } = useSyncQueue();

  // Skip auth check for login page
  const isLoginPage = pathname === "/employee/login";

  // Redirect if not authenticated (except for login page)
  // Redirect admins to admin portal
  useEffect(() => {
    if (!isLoading && !isLoginPage) {
      if (!isAuthenticated) {
        router.push("/employee/login");
      } else if (isAdmin && !isEmployee) {
        router.push("/admin");
      }
    }
  }, [isLoading, isAuthenticated, isEmployee, isAdmin, isLoginPage, router]);

  // Determine sync status for display
  const displaySyncStatus = isSyncing ? "syncing" : queueCount > 0 ? "pending" : isOnline ? "synced" : "offline";

  // Show loading only for authenticated pages
  if (isLoading && !isLoginPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Login page gets a simple layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <BatchScanProvider>
      <MobileLayout
        title={title}
        isOnline={isOnline}
        syncStatus={displaySyncStatus}
        pendingCount={queueCount}
        showNotifications={false}
      >
        {children}
      </MobileLayout>
    </BatchScanProvider>
  );
}
