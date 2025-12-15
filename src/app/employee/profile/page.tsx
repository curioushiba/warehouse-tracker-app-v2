"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Moon,
  Sun,
  LogOut,
  Camera,
} from "lucide-react";
import {
  Card,
  CardBody,
  Button,
  Avatar,
  Switch,
  Divider,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui";
import { SyncStatusIndicator } from "@/components/ui";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSyncQueue } from "@/hooks";

export default function ProfilePage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = React.useState(false);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);

  const { profile, signOut } = useAuthContext();
  const { queueCount, isSyncing, lastSyncTime } = useSyncQueue();

  const currentUser = {
    id: profile?.id || "N/A",
    name: profile ? `${profile.first_name} ${profile.last_name}` : "User",
    avatar: profile?.avatar_url || undefined,
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await signOut();
    router.push("/auth/login");
  };

  // Format last sync time
  const formatLastSync = () => {
    if (!lastSyncTime) return "Never";
    const syncDate = new Date(lastSyncTime);
    const diff = Date.now() - syncDate.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  };

  // Determine sync status for display
  const displaySyncStatus = isSyncing ? "syncing" : queueCount > 0 ? "pending" : "synced";

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card variant="elevated">
        <CardBody className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <Avatar
                name={currentUser.name}
                src={currentUser.avatar}
                size="2xl"
                className="border-4 border-primary-50"
              />
              <button className="absolute bottom-0 right-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white shadow-lg">
                <Camera className="w-5 h-5" />
              </button>
            </div>
            <h2 className="font-heading font-semibold text-xl text-foreground mt-4">
              {currentUser.name}
            </h2>
          </div>

          <Divider className="my-6" />

          {/* User Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-foreground-muted">Employee ID</p>
                <p className="font-medium text-foreground">{currentUser.id}</p>
              </div>
            </div>

          </div>

        </CardBody>
      </Card>

      {/* Quick Settings */}
      <Card variant="elevated">
        <CardBody className="p-0">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground">Quick Settings</h3>
          </div>
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                {darkMode ? (
                  <Moon className="w-5 h-5 text-foreground-muted" />
                ) : (
                  <Sun className="w-5 h-5 text-foreground-muted" />
                )}
                <div>
                  <p className="font-medium text-foreground">Dark Mode</p>
                  <p className="text-xs text-foreground-muted">
                    Toggle dark theme
                  </p>
                </div>
              </div>
              <Switch
                isChecked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
            </div>

          </div>
        </CardBody>
      </Card>

      {/* Sync Status */}
      <Card variant="filled" className="bg-neutral-100">
        <CardBody className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SyncStatusIndicator status={displaySyncStatus} size="md" showLabel />
              {queueCount > 0 && (
                <span className="text-xs text-foreground-muted">
                  ({queueCount} pending)
                </span>
              )}
            </div>
            <p className="text-xs text-foreground-muted">
              Last synced: {formatLastSync()}
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Logout Button */}
      <Button
        variant="outline"
        isFullWidth
        size="lg"
        leftIcon={<LogOut className="w-5 h-5" />}
        onClick={() => setShowLogoutModal(true)}
        className="text-error border-error hover:bg-error-light"
      >
        Log Out
      </Button>

      {/* App Version */}
      <p className="text-center text-xs text-foreground-muted">
        PackTrack v1.0.0
      </p>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        size="sm"
      >
        <ModalHeader showCloseButton onClose={() => setShowLogoutModal(false)}>
          Log Out
        </ModalHeader>
        <ModalBody>
          <p className="text-foreground-secondary">
            Are you sure you want to log out? Any pending transactions will be
            saved locally.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowLogoutModal(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleLogout}
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Log Out
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
