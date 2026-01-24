"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, WifiOff } from "lucide-react";
import { Button, Card, CardBody, Alert } from "@/components/ui";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  const isNetworkError =
    !isOnline ||
    error.message?.toLowerCase().includes("network") ||
    error.message?.toLowerCase().includes("fetch");

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card variant="elevated" className="max-w-md w-full">
        <CardBody className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-error-light flex items-center justify-center">
            {isNetworkError ? (
              <WifiOff className="w-8 h-8 text-error" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-error" />
            )}
          </div>

          <h1 className="text-h3 font-heading font-bold text-foreground mb-2">
            {isNetworkError ? "Connection Problem" : "Dashboard Error"}
          </h1>

          <p className="text-foreground-muted mb-6">
            {isNetworkError
              ? "Unable to load dashboard data. Please check your connection."
              : "Something went wrong loading this page."}
          </p>

          {!isOnline && (
            <Alert status="warning" variant="subtle" className="mb-6 text-left">
              <span className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 flex-shrink-0" />
                You are currently offline.
              </span>
            </Alert>
          )}

          {process.env.NODE_ENV === "development" && error.message && (
            <div className="mb-6 p-4 bg-neutral-100 rounded-lg text-left">
              <p className="text-sm font-mono text-error break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-foreground-muted mt-2">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="primary"
              onClick={reset}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Retry
            </Button>
            <Link href="/admin">
              <Button
                variant="secondary"
                leftIcon={<Home className="w-4 h-4" />}
              >
                Dashboard
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
