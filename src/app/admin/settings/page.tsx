"use client";

import * as React from "react";
import { Bell, BellOff, Moon, Sun, LogOut, RotateCcw } from "lucide-react";
import {
  Card,
  CardHeader,
  CardBody,
  Switch,
  Input,
  Button,
  Divider,
} from "@/components/ui";
import { useSettings } from "@/contexts/SettingsContext";

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettings();

  const handleLogout = () => {
    // In production, this would call an auth logout function
    // For now, redirect to home
    window.location.href = "/";
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Alert Settings */}
      <Card variant="elevated" size="md">
        <CardHeader
          title="Alert Settings"
          subtitle="Configure inventory alert notifications"
          hasBorder
        />
        <CardBody className="space-y-6">
          {/* Low Stock Alerts */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center">
                <Bell className="w-5 h-5 text-warning-dark" />
              </div>
              <div>
                <p className="font-medium text-foreground">Low Stock Alerts</p>
                <p className="text-sm text-foreground-muted">
                  Get notified when items fall below minimum stock level
                </p>
              </div>
            </div>
            <Switch
              isChecked={settings.enableLowStockAlerts}
              onChange={(e) =>
                updateSettings({ enableLowStockAlerts: e.target.checked })
              }
              colorScheme="success"
            />
          </div>

          <Divider />

          {/* Critical Alerts */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-error-light flex items-center justify-center">
                <BellOff className="w-5 h-5 text-error-dark" />
              </div>
              <div>
                <p className="font-medium text-foreground">Critical Alerts</p>
                <p className="text-sm text-foreground-muted">
                  Get urgent notifications for critically low stock items
                </p>
              </div>
            </div>
            <Switch
              isChecked={settings.enableCriticalAlerts}
              onChange={(e) =>
                updateSettings({ enableCriticalAlerts: e.target.checked })
              }
              colorScheme="success"
            />
          </div>

          <Divider />

          {/* Auto-reorder Point */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Auto-reorder Point</p>
              <p className="text-sm text-foreground-muted">
                Default suggested quantity for reordering items
              </p>
            </div>
            <div className="w-24">
              <Input
                type="number"
                min={1}
                max={1000}
                value={settings.autoReorderPoint}
                onChange={(e) =>
                  updateSettings({
                    autoReorderPoint: parseInt(e.target.value) || 15,
                  })
                }
                size="sm"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Display Settings */}
      <Card variant="elevated" size="md">
        <CardHeader
          title="Display Settings"
          subtitle="Customize your viewing experience"
          hasBorder
        />
        <CardBody>
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              {settings.darkMode ? (
                <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-neutral-200" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center">
                  <Sun className="w-5 h-5 text-warning-dark" />
                </div>
              )}
              <div>
                <p className="font-medium text-foreground">Dark Mode</p>
                <p className="text-sm text-foreground-muted">
                  Switch between light and dark themes
                </p>
              </div>
            </div>
            <Switch
              isChecked={settings.darkMode}
              onChange={(e) => updateSettings({ darkMode: e.target.checked })}
              colorScheme="primary"
            />
          </div>
        </CardBody>
      </Card>

      {/* Account Settings */}
      <Card variant="elevated" size="md">
        <CardHeader
          title="Account"
          subtitle="Manage your account settings"
          hasBorder
        />
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-error-light flex items-center justify-center">
                <LogOut className="w-5 h-5 text-error-dark" />
              </div>
              <div>
                <p className="font-medium text-foreground">Logout</p>
                <p className="text-sm text-foreground-muted">
                  Sign out of your account
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Reset Settings */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<RotateCcw className="w-4 h-4" />}
          onClick={resetSettings}
        >
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
