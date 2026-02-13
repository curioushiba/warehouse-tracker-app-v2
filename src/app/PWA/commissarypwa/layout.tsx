import type { Metadata, Viewport } from "next";
import CommissaryClientLayout from "./CommissaryClientLayout";

export const metadata: Metadata = {
  title: "Commissary - PackTrack",
  description: "Check in/out commissary inventory items",
  manifest: "/PWA/commissarypwa/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Commissary",
  },
  icons: {
    apple: "/icons/commissary/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#E07A2F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function CommissaryPWAServerLayout({
  children,
}: { children: React.ReactNode }) {
  return <CommissaryClientLayout>{children}</CommissaryClientLayout>;
}
