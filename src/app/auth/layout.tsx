"use client";
import React from "react";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-secondary relative overflow-x-hidden flex flex-col items-center pt-8 sm:pt-12 md:pt-20">

      {/* Top Wavy Green Background Pattern */}
      <div className="absolute top-0 left-0 right-0 h-[45vh] w-full z-0 overflow-hidden pointer-events-none">
        <svg
          viewBox="0 0 1440 320"
          className="absolute top-0 w-full h-full object-cover text-primary-100 opacity-30 transform scale-125"
          preserveAspectRatio="none"
        >
          <path fill="currentColor" fillOpacity="1" d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,197.3C1248,213,1344,203,1392,197.3L1440,192L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
        </svg>
      </div>

      {/* Hero Image - Circular */}
      <div className="relative z-10 mb-2 animate-in fade-in zoom-in duration-500">
        <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-full bg-primary flex items-center justify-center shadow-xl border-8 border-secondary relative overflow-hidden">
          <Image
            src="/images/auth-hero.jpg"
            alt="Dog with scanner"
            fill
            className="object-cover scale-110"
            priority
          />
          {/* Inner Ring for "Scannable" effect */}
          <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-sm px-6 pb-12 flex flex-col items-center">
        {/* Title area is handled by children (Login Page) but we structure the container here */}

        <div className="w-full">
          {children}
        </div>

        <div className="mt-12 text-center text-foreground-placeholder text-xs font-medium tracking-wider uppercase">
          Admin Portal Login
        </div>

        <div className="mt-4 text-foreground-muted/60 text-[10px] font-mono">
          Wildlife Reserve System v1.1
        </div>
      </div>
    </div>
  );
}
