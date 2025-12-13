"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  QrCode,
  History,
  User,
  ArrowLeft,
  Bell,
} from "lucide-react";
import { IconButton, Avatar, ToastProvider } from "@/components/ui";
import { OnlineIndicator, ConnectionStatusBar } from "@/components/ui";
import type { SyncStatus } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const bottomNavItems: NavItem[] = [
  { label: "Home", href: "/employee", icon: Home },
  { label: "Scan", href: "/employee/scan", icon: QrCode },
  { label: "History", href: "/employee/history", icon: History },
  { label: "Profile", href: "/employee/profile", icon: User },
];

export interface MobileHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  showNotifications?: boolean;
  notificationCount?: number;
  rightAction?: React.ReactNode;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title = "Inventory",
  showBackButton = false,
  onBackClick,
  showNotifications = true,
  notificationCount = 0,
  rightAction,
}) => {
  return (
    <header className="sticky top-0 z-sticky bg-white border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {showBackButton ? (
            <IconButton
              icon={<ArrowLeft />}
              aria-label="Go back"
              variant="ghost"
              size="sm"
              onClick={onBackClick}
            />
          ) : (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
          )}
          <h1 className="font-heading font-semibold text-lg text-foreground">
            {title}
          </h1>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {rightAction}
          {showNotifications && (
            <Link href="/employee/notifications" className="relative">
              <IconButton
                icon={<Bell />}
                aria-label="Notifications"
                variant="ghost"
                size="sm"
              />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-error rounded-full">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export interface MobileBottomNavProps {
  className?: string;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ className }) => {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-border",
        "flex items-center justify-around px-2 z-fixed pb-safe",
        className
      )}
    >
      {bottomNavItems.map((item) => {
        const isActive =
          item.href === "/employee"
            ? pathname === "/employee"
            : pathname?.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-16 py-1",
              "text-foreground-muted transition-colors touch-target",
              isActive && "text-primary"
            )}
          >
            <Icon className={cn("w-6 h-6", isActive && "text-primary")} />
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  showBottomNav?: boolean;
  showNotifications?: boolean;
  notificationCount?: number;
  headerRightAction?: React.ReactNode;
  isOnline?: boolean;
  syncStatus?: SyncStatus;
  pendingCount?: number;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title = "Inventory",
  showBackButton = false,
  onBackClick,
  showBottomNav = true,
  showNotifications = true,
  notificationCount = 0,
  headerRightAction,
  isOnline = true,
  syncStatus = "synced",
  pendingCount = 0,
}) => {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-background-secondary flex flex-col">
        {/* Connection Status Bar */}
        <ConnectionStatusBar
          isOnline={isOnline}
          syncStatus={syncStatus}
          pendingCount={pendingCount}
        />

        {/* Header */}
        <MobileHeader
          title={title}
          showBackButton={showBackButton}
          onBackClick={onBackClick}
          showNotifications={showNotifications}
          notificationCount={notificationCount}
          rightAction={headerRightAction}
        />

        {/* Main Content */}
        <main
          className={cn(
            "flex-1 overflow-y-auto p-4",
            showBottomNav && "pb-20" // Account for bottom nav
          )}
        >
          {children}
        </main>

        {/* Bottom Navigation */}
        {showBottomNav && <MobileBottomNav />}
      </div>
    </ToastProvider>
  );
};

export default MobileLayout;
