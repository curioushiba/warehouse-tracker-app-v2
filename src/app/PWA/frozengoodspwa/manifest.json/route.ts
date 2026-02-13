import { NextResponse } from 'next/server'

export async function GET() {
  const manifest = {
    id: "/PWA/frozengoodspwa",
    name: "Frozen Goods - PackTrack",
    short_name: "Frozen Goods",
    description: "Check in/out frozen inventory items",
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: "#0077b6",
    background_color: "#f0f8ff",
    scope: "/PWA/frozengoodspwa",
    start_url: "/PWA/frozengoodspwa",
    icons: [
      {
        src: "/icons/frozen-goods/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/frozen-goods/icon-512x512.png",
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
