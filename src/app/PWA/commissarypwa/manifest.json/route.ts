import { NextResponse } from 'next/server'

export async function GET() {
  const manifest = {
    name: "Commissary - PackTrack",
    short_name: "Commissary",
    description: "Check in/out commissary inventory items",
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: "#E07A2F",
    background_color: "#FFF8F0",
    scope: "/PWA/commissarypwa",
    start_url: "/PWA/commissarypwa",
    icons: [
      {
        src: "/icons/commissary/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/commissary/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
    },
  })
}
