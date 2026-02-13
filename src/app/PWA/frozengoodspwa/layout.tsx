import type { Metadata, Viewport } from "next";
import FrozenGoodsClientLayout from "./FrozenGoodsClientLayout";

export const metadata: Metadata = {
  title: "Frozen Goods - PackTrack",
  description: "Check in/out frozen inventory items",
  manifest: "/PWA/frozengoodspwa/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Frozen Goods",
  },
  icons: {
    apple: "/icons/frozen-goods/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0077b6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function FrozenGoodsPWAServerLayout({
  children,
}: { children: React.ReactNode }) {
  return <FrozenGoodsClientLayout>{children}</FrozenGoodsClientLayout>;
}
