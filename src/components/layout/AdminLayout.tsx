"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { ToastProvider } from "@/components/ui";
import type { SyncStatus } from "@/types";

export interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  isOnline?: boolean;
  syncStatus?: SyncStatus;
  notificationCount?: number;
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  onSignOut?: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title = "Dashboard",
  subtitle,
  isOnline = true,
  syncStatus = "synced",
  notificationCount = 0,
  user,
  onSignOut,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <ToastProvider>
      <div className="flex h-screen bg-background-secondary overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex">
          <AdminSidebar
            isCollapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
            user={user ? { ...user, role: user.role || "Admin" } : undefined}
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-modalBackdrop bg-black/50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-modal transform transition-transform duration-200 lg:hidden",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <AdminSidebar
            isCollapsed={false}
            user={user ? { ...user, role: user.role || "Admin" } : undefined}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AdminHeader
            title={title}
            subtitle={subtitle}
            onMenuClick={() => setMobileMenuOpen(true)}
            isOnline={isOnline}
            syncStatus={syncStatus}
            notificationCount={notificationCount}
            user={user}
            onSignOut={onSignOut}
          />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="max-w-container-2xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
};

export default AdminLayout;
