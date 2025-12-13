"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Menu,
  Bell,
  Search,
  Settings,
  User,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { Button, IconButton, SearchInput, Avatar, Badge } from "@/components/ui";
import { OnlineIndicator, SyncStatusIndicator } from "@/components/ui";
import type { SyncStatus } from "@/types";

export interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
  onMenuClick?: () => void;
  showMobileMenu?: boolean;
  isOnline?: boolean;
  syncStatus?: SyncStatus;
  notificationCount?: number;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  onSignOut?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title = "Dashboard",
  subtitle,
  onMenuClick,
  showMobileMenu = true,
  isOnline = true,
  syncStatus = "synced",
  notificationCount = 0,
  user,
  onSignOut,
}) => {
  const [showUserDropdown, setShowUserDropdown] = React.useState(false);
  const userDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-sticky bg-white border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          {showMobileMenu && (
            <IconButton
              icon={<Menu />}
              aria-label="Open menu"
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="lg:hidden"
            />
          )}

          {/* Page Title */}
          <div>
            <h1 className="font-heading font-semibold text-lg text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-foreground-muted">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Center Section - Search (hidden on mobile) */}
        <div className="hidden md:block flex-1 max-w-md mx-8">
          <SearchInput
            placeholder="Search items, transactions..."
            size="sm"
            className="w-full"
          />
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Status Indicators */}
          <div className="hidden sm:flex items-center gap-3 pr-3 border-r border-border">
            <OnlineIndicator isOnline={isOnline} showLabel={false} size="sm" />
            <SyncStatusIndicator status={syncStatus} showLabel={false} size="sm" />
          </div>

          {/* Notifications */}
          <div className="relative">
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
          </div>

          {/* User Menu */}
          {user && (
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <Avatar name={user.name} src={user.avatar} size="sm" />
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-foreground-muted hidden sm:block transition-transform",
                  showUserDropdown && "rotate-180"
                )}
              />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-border py-1 z-dropdown animate-fade-in">
                <div className="px-4 py-3 border-b border-border">
                  <p className="font-medium text-foreground">{user.name}</p>
                  <p className="text-sm text-foreground-muted">{user.email}</p>
                </div>
                <div className="py-1">
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-neutral-50 transition-colors">
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-neutral-50 transition-colors">
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                </div>
                <div className="border-t border-border pt-1">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onSignOut?.();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-error hover:bg-error-light transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
