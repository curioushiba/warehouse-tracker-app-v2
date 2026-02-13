"use client";

import { MobileLayout, type NavItem } from "@/components/layout/MobileLayout";
import { usePathname, useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { BatchScanProvider } from "@/contexts/BatchScanContext";
import { useOnlineStatus, useSyncQueue, useSyncErrorCount } from "@/hooks";
import { useEffect } from "react";
import { Home, QrCode, History, User } from "lucide-react";
import type { SyncStatus } from "@/types";

const commissaryNavItems: NavItem[] = [
  { label: "Home", href: "/PWA/commissarypwa", icon: Home },
  { label: "Scan", href: "/PWA/commissarypwa/scan", icon: QrCode },
  { label: "History", href: "/PWA/commissarypwa/history", icon: History },
  { label: "Profile", href: "/PWA/commissarypwa/profile", icon: User },
];

const pageTitles: Record<string, string> = {
  "/PWA/commissarypwa": "Commissary",
  "/PWA/commissarypwa/scan": "Scan Item",
  "/PWA/commissarypwa/batch-review": "Review Items",
  "/PWA/commissarypwa/history": "History",
  "/PWA/commissarypwa/profile": "Profile",
};

export default function CommissaryPWALayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const title = pageTitles[pathname || ""] || "Commissary";

  const { isLoading, isAuthenticated, isEmployee, isAdmin } = useAuthContext();
  const { isOnline } = useOnlineStatus();
  const { queueCount, isSyncing, lastSyncTime } = useSyncQueue();
  const { failedSyncCount, refetch: refetchSyncErrorCount } = useSyncErrorCount();

  useEffect(() => {
    if (lastSyncTime) {
      refetchSyncErrorCount();
    }
  }, [lastSyncTime, refetchSyncErrorCount]);

  const isLoginPage = pathname === "/PWA/commissarypwa/login";

  useEffect(() => {
    if (!isLoading && !isLoginPage) {
      if (!isAuthenticated) {
        router.push("/PWA/commissarypwa/login");
      } else if (isAdmin && !isEmployee) {
        router.push("/admin");
      }
    }
  }, [isLoading, isAuthenticated, isEmployee, isAdmin, isLoginPage, router]);

  function getSyncStatus(): SyncStatus {
    if (isSyncing) return "syncing";
    if (queueCount > 0) return "pending";
    if (isOnline) return "synced";
    return "offline";
  }

  const displaySyncStatus = getSyncStatus();

  if (isLoading && !isLoginPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E07A2F]"></div>
      </div>
    );
  }

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
        failedSyncCount={failedSyncCount}
        bottomNavItems={commissaryNavItems}
        appLetter="C"
        brandColorClass="bg-[#E07A2F]"
        failedSyncsHref="/PWA/commissarypwa/profile"
      >
        {children}
      </MobileLayout>
    </BatchScanProvider>
  );
}
