"use client";

import Link from "next/link";
import Image from "next/image";
import { ScanBarcode, PawPrint } from "lucide-react";
import { Button } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      {/* Main Spotlight Card */}
      <div className="relative w-full max-w-md">

        {/* Hero Image - Floating above card */}
        <div className="relative z-10 flex justify-center -mb-20">
          <div className="relative w-64 h-64 rounded-full flex items-center justify-center overflow-visible">
            {/* Green Circle Background for Icon if needed, or just let the icon shine */}
            {/* Using the scan-icon-circle.png as requested */}
            <Link href="/admin" className="cursor-pointer">
              <Image
                src="/icons/scan-icon-circle.png"
                alt="Ready to Scan"
                width={256}
                height={256}
                priority
                className="object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500 ease-nature"
              />
            </Link>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-[32px] shadow-2xl pt-24 pb-8 px-8 text-center relative z-0 mt-8 border border-white/50 backdrop-blur-sm">
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-primary-900 mb-4 tracking-tight">
            Ready to Scan?
          </h1>

          <p className="text-foreground-muted text-lg mb-8 max-w-xs mx-auto leading-relaxed">
            Welcome back. Tap below to launch your scanner for today&apos;s tasks.
          </p>

          <div className="space-y-6">
            <Link href="/employee" className="block transform transition-all hover:scale-[1.02] active:scale-[0.98]">
              <Button
                variant="cta"
                size="lg"
                className="w-full h-14 rounded-full text-lg font-bold shadow-lg hover:shadow-xl bg-cta text-foreground border-none flex items-center justify-center gap-3"
              >
                <ScanBarcode className="w-5 h-5" />
                Ready to Scan?
              </Button>
            </Link>

            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-foreground-muted hover:text-primary transition-colors text-sm font-medium"
            >
              <PawPrint className="w-4 h-4" />
              The Dog House
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 opacity-40 hover:opacity-100 transition-opacity">
          <p className="text-xs font-mono text-foreground-muted">PackTrack v1.0.0</p>
        </div>

      </div>
    </div>
  );
}
