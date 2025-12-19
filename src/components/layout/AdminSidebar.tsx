"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  MapPin,
  ArrowLeftRight,
  Users,
  Settings,
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  HelpCircle,
  ClipboardCheck,
} from "lucide-react";
import { Avatar } from "@/components/ui";
import { Tooltip } from "@/components/ui";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Notifications", href: "/admin/notifications", icon: Bell, badge: 5 },
    ],
  },
  {
    title: "Inventory",
    items: [
      { label: "Items", href: "/admin/items", icon: Package },
      { label: "Categories", href: "/admin/categories", icon: FolderTree },
      { label: "Locations", href: "/admin/locations", icon: MapPin },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Transactions", href: "/admin/transactions", icon: ArrowLeftRight },
      { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    ],
  },
  {
    title: "Attendance",
    items: [
      { label: "Stores", href: "/admin/attendance/stores", icon: ClipboardCheck },
      { label: "Employees", href: "/admin/attendance/employees", icon: Users },
      { label: "Records", href: "/admin/attendance/records", icon: BarChart3 },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export interface AdminSidebarProps {
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isCollapsed = false,
  onCollapsedChange,
  user,
}) => {
  const pathname = usePathname();

  const NavItemComponent: React.FC<{ item: NavItem }> = ({ item }) => {
    const isActive = pathname === item.href ||
      (item.href !== "/admin" && pathname?.startsWith(item.href));
    const Icon = item.icon;

    const content = (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150",
          "text-foreground-muted hover:text-foreground hover:bg-primary-50",
          isActive && "bg-primary-50 text-primary font-medium",
          isCollapsed && "justify-center px-2"
        )}
      >
        <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />
        {!isCollapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-error text-white">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip content={item.label} placement="right">
          {content}
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-white border-r border-border transition-all duration-200",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-16 px-4 border-b border-border",
          isCollapsed ? "justify-center" : "gap-3"
        )}
      >
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Package className="w-5 h-5 text-white" />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col">
            <span className="font-heading font-semibold text-sm text-foreground">
              PackTrack
            </span>
            <span className="text-xs text-foreground-muted">Inventory Management</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
        {navSections.map((section, index) => (
          <div key={section.title} className={cn(index > 0 && "mt-6")}>
            {!isCollapsed && (
              <h3 className="px-3 mb-2 text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavItemComponent key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-border p-3 space-y-2">
        {/* Help Link */}
        <Link
          href="/admin/help"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
            "text-foreground-muted hover:text-foreground hover:bg-neutral-50",
            isCollapsed && "justify-center px-2"
          )}
        >
          <HelpCircle className="w-5 h-5" />
          {!isCollapsed && <span>Help & Support</span>}
        </Link>

        {/* User Profile */}
        {user && (
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg bg-neutral-50",
            isCollapsed && "justify-center"
          )}
        >
          <Avatar name={user.name} src={user.avatar} size="sm" />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user.name}
              </p>
              <p className="text-xs text-foreground-muted truncate">{user.role}</p>
            </div>
          )}
          {!isCollapsed && (
            <button
              className="p-1.5 rounded-lg hover:bg-neutral-200 transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4 text-foreground-muted" />
            </button>
          )}
        </div>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={() => onCollapsedChange?.(!isCollapsed)}
          className={cn(
            "flex items-center justify-center w-full py-2 rounded-lg",
            "text-foreground-muted hover:text-foreground hover:bg-neutral-50 transition-colors"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
