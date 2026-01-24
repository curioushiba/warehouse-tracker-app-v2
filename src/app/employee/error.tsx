"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, WifiOff } from "lucide-react";
import { Button, Card, CardBody, Alert } from "@/components/ui";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function EmployeeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    console.error("Employee app error:", error);
  }, [error]);

  const isNetworkError =
    !isOnline ||
    error.message?.toLowerCase().includes("network") ||
    error.message?.toLowerCase().includes("fetch");

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-4">
      <Card variant="elevated" className="max-w-sm w-full">
        <CardBody className="text-center p-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-error-light flex items-center justify-center">
            {isNetworkError ? (
              <WifiOff className="w-7 h-7 text-error" />
            ) : (
              <AlertTriangle className="w-7 h-7 text-error" />
            )}
          </div>

          <h1 className="text-h4 font-heading font-bold text-foreground mb-2">
            {isNetworkError ? "You're Offline" : "Oops!"}
          </h1>

          <p className="text-sm text-foreground-muted mb-5">
            {isNetworkError
              ? "Check your connection and try again."
              : "Something went wrong. Let's try again."}
          </p>

          {!isOnline && (
            <Alert status="warning" variant="subtle" className="mb-5 text-left text-sm">
              <span className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 flex-shrink-0" />
                Offline mode active. Pending changes will sync when you reconnect.
              </span>
            </Alert>
          )}

          {process.env.NODE_ENV === "development" && error.message && (
            <div className="mb-5 p-3 bg-neutral-100 rounded-lg text-left">
              <p className="text-xs font-mono text-error break-all">
                {error.message}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              onClick={reset}
              leftIcon={<RefreshCw className="w-4 h-4" />}
              className="w-full"
            >
              Try Again
            </Button>
            <Link href="/employee" className="w-full">
              <Button
                variant="secondary"
                leftIcon={<Home className="w-4 h-4" />}
                className="w-full"
              >
                Go Home
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
