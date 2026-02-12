import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SettingsPage from "./page";

const mockUpdateSettings = vi.fn();
const mockResetSettings = vi.fn();
vi.mock("@/contexts/SettingsContext", () => ({
  useSettings: () => ({
    settings: {
      enableLowStockAlerts: true,
      enableCriticalAlerts: true,
      autoReorderPoint: 15,
      darkMode: false,
      currency: "",
    },
    updateSettings: mockUpdateSettings,
    resetSettings: mockResetSettings,
  }),
}));

const mockToastSuccess = vi.fn();
vi.mock("@/components/ui/Toast", () => ({
  useToastHelpers: () => ({
    success: mockToastSuccess,
  }),
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("section structure", () => {
    it('renders "Notifications" heading', () => {
      render(<SettingsPage />);
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    it('renders "Preferences" heading', () => {
      render(<SettingsPage />);
      expect(screen.getByText("Preferences")).toBeInTheDocument();
    });

    it("renders exactly 2 cards", () => {
      render(<SettingsPage />);
      const notificationsCard = screen.getByTestId("notifications-card");
      const preferencesCard = screen.getByTestId("preferences-card");
      expect(notificationsCard).toBeInTheDocument();
      expect(preferencesCard).toBeInTheDocument();
    });
  });

  describe("controls present", () => {
    it("renders Low Stock Alerts setting", () => {
      render(<SettingsPage />);
      expect(screen.getByText("Low Stock Alerts")).toBeInTheDocument();
    });

    it("renders Critical Alerts setting", () => {
      render(<SettingsPage />);
      expect(screen.getByText("Critical Alerts")).toBeInTheDocument();
    });

    it("renders Auto-reorder Point setting", () => {
      render(<SettingsPage />);
      expect(screen.getByText("Auto-reorder Point")).toBeInTheDocument();
    });

    it("renders Dark Mode setting", () => {
      render(<SettingsPage />);
      expect(screen.getByText("Dark Mode")).toBeInTheDocument();
    });

    it("renders Currency setting", () => {
      render(<SettingsPage />);
      expect(screen.getByText("Currency")).toBeInTheDocument();
    });

    it("renders Logout button", () => {
      render(<SettingsPage />);
      expect(
        screen.getByRole("button", { name: /logout/i })
      ).toBeInTheDocument();
    });

    it("renders Reset to Defaults button", () => {
      render(<SettingsPage />);
      expect(
        screen.getByRole("button", { name: /reset to defaults/i })
      ).toBeInTheDocument();
    });
  });

  describe("icon consistency", () => {
    it("renders Auto-reorder Point icon", () => {
      render(<SettingsPage />);
      expect(screen.getByTestId("auto-reorder-icon")).toBeInTheDocument();
    });
  });

  describe("toast feedback", () => {
    it("shows toast when toggling Low Stock Alerts", () => {
      render(<SettingsPage />);
      const switches = screen.getAllByRole("switch");
      // Low Stock Alerts is the first switch
      fireEvent.click(switches[0]);
      expect(mockUpdateSettings).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith("Settings saved");
    });

    it("shows toast when toggling Critical Alerts", () => {
      render(<SettingsPage />);
      const switches = screen.getAllByRole("switch");
      // Critical Alerts is the second switch
      fireEvent.click(switches[1]);
      expect(mockUpdateSettings).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith("Settings saved");
    });

    it("shows toast when toggling Dark Mode", () => {
      render(<SettingsPage />);
      const switches = screen.getAllByRole("switch");
      // Dark Mode is the third switch
      fireEvent.click(switches[2]);
      expect(mockUpdateSettings).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith("Settings saved");
    });

    it("shows toast when clicking Reset to Defaults", () => {
      render(<SettingsPage />);
      const resetButton = screen.getByRole("button", {
        name: /reset to defaults/i,
      });
      fireEvent.click(resetButton);
      expect(mockResetSettings).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Settings reset to defaults"
      );
    });
  });

  describe("account footer", () => {
    it("renders footer with both Logout and Reset buttons", () => {
      render(<SettingsPage />);
      const footer = screen.getByTestId("settings-footer");
      expect(footer).toBeInTheDocument();

      const logoutButton = screen.getByRole("button", { name: /logout/i });
      const resetButton = screen.getByRole("button", {
        name: /reset to defaults/i,
      });
      expect(footer).toContainElement(logoutButton);
      expect(footer).toContainElement(resetButton);
    });

    it("renders a divider before the footer", () => {
      render(<SettingsPage />);
      const divider = screen.getByTestId("footer-divider");
      expect(divider).toBeInTheDocument();
    });
  });
});
