"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { Button, Card, CardBody, Alert } from "@/components/ui";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    console.error("Auth error:", error);
  }, [error]);

  const isNetworkError =
    !isOnline ||
    error.message?.toLowerCase().includes("network") ||
    error.message?.toLowerCase().includes("fetch");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-secondary p-4">
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
            {isNetworkError ? "Connection Required" : "Authentication Error"}
          </h1>

          <p className="text-foreground-muted mb-6">
            {isNetworkError
              ? "A stable internet connection is required to sign in."
              : "There was a problem with authentication. Please try again."}
          </p>

          {!isOnline && (
            <Alert status="warning" variant="subtle" className="mb-6 text-left">
              <span className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 flex-shrink-0" />
                You must be online to sign in.
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
              disabled={!isOnline}
            >
              Try Again
            </Button>
            <Link href="/">
              <Button variant="secondary">Back to Home</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
