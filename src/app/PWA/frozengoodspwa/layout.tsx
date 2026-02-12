"use client";

import { MobileLayout, type NavItem } from "@/components/layout/MobileLayout";
import { usePathname, useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { BatchScanProvider } from "@/contexts/BatchScanContext";
import { useOnlineStatus, useSyncQueue, useSyncErrorCount } from "@/hooks";
import { useEffect } from "react";
import { Home, QrCode, History, User } from "lucide-react";

const frozenNavItems: NavItem[] = [
  { label: "Home", href: "/PWA/frozengoodspwa", icon: Home },
  { label: "Scan", href: "/PWA/frozengoodspwa/scan", icon: QrCode },
  { label: "History", href: "/PWA/frozengoodspwa/history", icon: History },
  { label: "Profile", href: "/PWA/frozengoodspwa/profile", icon: User },
];

const pageTitles: Record<string, string> = {
  "/PWA/frozengoodspwa": "Frozen Goods",
  "/PWA/frozengoodspwa/scan": "Scan Item",
  "/PWA/frozengoodspwa/batch-review": "Review Items",
  "/PWA/frozengoodspwa/history": "History",
  "/PWA/frozengoodspwa/profile": "Profile",
};

export default function FrozenGoodsPWALayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const title = pageTitles[pathname || ""] || "Frozen Goods";

  const { isLoading, isAuthenticated, isEmployee, isAdmin } = useAuthContext();
  const { isOnline } = useOnlineStatus();
  const { queueCount, isSyncing, lastSyncTime } = useSyncQueue();
  const { failedSyncCount, refetch: refetchSyncErrorCount } = useSyncErrorCount();

  useEffect(() => {
    if (lastSyncTime) {
      refetchSyncErrorCount();
    }
  }, [lastSyncTime, refetchSyncErrorCount]);

  const isLoginPage = pathname === "/PWA/frozengoodspwa/login";

  useEffect(() => {
    if (!isLoading && !isLoginPage) {
      if (!isAuthenticated) {
        router.push("/PWA/frozengoodspwa/login");
      } else if (isAdmin && !isEmployee) {
        router.push("/admin");
      }
    }
  }, [isLoading, isAuthenticated, isEmployee, isAdmin, isLoginPage, router]);

  const displaySyncStatus = isSyncing ? "syncing" : queueCount > 0 ? "pending" : isOnline ? "synced" : "offline";

  if (isLoading && !isLoginPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0077b6]"></div>
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
        bottomNavItems={frozenNavItems}
        appLetter="F"
        brandColorClass="bg-[#0077b6]"
        failedSyncsHref="/PWA/frozengoodspwa/profile"
      >
        {children}
      </MobileLayout>
    </BatchScanProvider>
  );
}
