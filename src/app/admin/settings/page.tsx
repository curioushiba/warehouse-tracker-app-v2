"use client";

import * as React from "react";
import {
  Bell,
  BellOff,
  DollarSign,
  LogOut,
  Moon,
  PackageCheck,
  RotateCcw,
  Sun,
} from "lucide-react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
  Select,
  Switch,
} from "@/components/ui";
import { useSettings } from "@/contexts/SettingsContext";
import { useToastHelpers } from "@/components/ui/Toast";
import type { AppSettings } from "@/lib/settings";

const CURRENCY_OPTIONS = [
  { value: "", label: "No Currency" },
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "SGD", label: "SGD ($)" },
  { value: "JPY", label: "JPY (¥)" },
  { value: "CNY", label: "CNY (¥)" },
  { value: "AUD", label: "AUD ($)" },
  { value: "CAD", label: "CAD ($)" },
  { value: "INR", label: "INR (₹)" },
  { value: "PHP", label: "PHP (₱)" },
] as const;

interface SettingRowProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  description: string;
  control: React.ReactNode;
  testId?: string;
}

function SettingRow({
  icon,
  iconBg,
  iconColor,
  label,
  description,
  control,
  testId,
}: SettingRowProps) {
  return (
    <div
      data-testid={testId ? `setting-row-${testId}` : undefined}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0 transition-colors duration-200`}
        >
          <span className={iconColor}>{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-sm text-foreground-muted">{description}</p>
        </div>
      </div>
      <div className="flex-shrink-0 sm:ml-4 pl-[52px] sm:pl-0">{control}</div>
    </div>
  );
}

export default function SettingsPage(): React.JSX.Element {
  const { settings, updateSettings, resetSettings } = useSettings();
  const toast = useToastHelpers();
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  function handleUpdate(updates: Partial<AppSettings>): void {
    updateSettings(updates);
    toast.success("Settings saved");
  }

  function handleReorderPointChange(value: number): void {
    updateSettings({ autoReorderPoint: value });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      toast.success("Settings saved");
    }, 800);
  }

  function handleReset(): void {
    resetSettings();
    toast.success("Settings reset to defaults");
  }

  function handleLogout(): void {
    window.location.href = "/";
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Notifications Card */}
      <Card variant="elevated" size="md" data-testid="notifications-card">
        <CardHeader
          title="Notifications"
          subtitle="Configure inventory alert preferences"
          hasBorder
        />
        <CardBody className="space-y-5">
          <SettingRow
            icon={<Bell className="w-5 h-5" />}
            iconBg="bg-warning-light"
            iconColor="text-warning-dark"
            label="Low Stock Alerts"
            description="Get notified when items fall below minimum stock level"
            testId="low-stock"
            control={
              <Switch
                isChecked={settings.enableLowStockAlerts}
                onChange={(e) =>
                  handleUpdate({ enableLowStockAlerts: e.target.checked })
                }
                colorScheme="success"
              />
            }
          />

          <Divider />

          <SettingRow
            icon={<BellOff className="w-5 h-5" />}
            iconBg="bg-error-light"
            iconColor="text-error-dark"
            label="Critical Alerts"
            description="Get urgent notifications for critically low stock items"
            testId="critical-alerts"
            control={
              <Switch
                isChecked={settings.enableCriticalAlerts}
                onChange={(e) =>
                  handleUpdate({ enableCriticalAlerts: e.target.checked })
                }
                colorScheme="success"
              />
            }
          />

          <Divider />

          <SettingRow
            icon={
              <span data-testid="auto-reorder-icon">
                <PackageCheck className="w-5 h-5" />
              </span>
            }
            iconBg="bg-info-light"
            iconColor="text-info-dark"
            label="Auto-reorder Point"
            description="Default suggested quantity for reordering items"
            testId="auto-reorder"
            control={
              <div className="w-24">
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={settings.autoReorderPoint}
                  onChange={(e) =>
                    handleReorderPointChange(parseInt(e.target.value) || 15)
                  }
                  size="sm"
                />
              </div>
            }
          />
        </CardBody>
      </Card>

      {/* Preferences Card */}
      <Card variant="outline" size="md" data-testid="preferences-card">
        <CardHeader
          title="Preferences"
          subtitle="Customize your display and regional settings"
          hasBorder
        />
        <CardBody className="space-y-5">
          <SettingRow
            icon={settings.darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            iconBg={settings.darkMode ? "bg-neutral-800" : "bg-warning-light"}
            iconColor={settings.darkMode ? "text-neutral-200" : "text-warning-dark"}
            label="Dark Mode"
            description="Switch between light and dark themes"
            testId="dark-mode"
            control={
              <Switch
                isChecked={settings.darkMode}
                onChange={(e) =>
                  handleUpdate({ darkMode: e.target.checked })
                }
                colorScheme="primary"
              />
            }
          />

          <Divider />

          <SettingRow
            icon={<DollarSign className="w-5 h-5" />}
            iconBg="bg-success-light"
            iconColor="text-success-dark"
            label="Currency"
            description="Select a currency or leave blank for plain numbers"
            testId="currency"
            control={
              <div className="w-40">
                <Select
                  options={CURRENCY_OPTIONS}
                  value={settings.currency}
                  onChange={(value) => handleUpdate({ currency: value })}
                />
              </div>
            }
          />
        </CardBody>
      </Card>

      {/* Footer */}
      <Divider data-testid="footer-divider" />
      <div
        data-testid="settings-footer"
        className="flex items-center justify-between"
      >
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<RotateCcw className="w-4 h-4" />}
          onClick={handleReset}
        >
          Reset to Defaults
        </Button>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<LogOut className="w-4 h-4" />}
          onClick={handleLogout}
          className="text-error border-error hover:bg-error hover:text-white"
        >
          Logout
        </Button>
      </div>
    </div>
  );
}
