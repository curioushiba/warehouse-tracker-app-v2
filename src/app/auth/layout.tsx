"use client";

import { Package } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Inventory Tracker
          </h1>
          <p className="text-sm text-foreground-muted mt-1">
            Inventory Management System
          </p>
        </div>

        {/* Auth Card */}
        {children}

        {/* Footer */}
        <p className="text-center text-xs text-foreground-muted mt-8">
          Inventory Tracker &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
