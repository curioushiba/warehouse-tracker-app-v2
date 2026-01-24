"use client";

import Link from "next/link";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import { Button, Card, CardBody } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-secondary p-4">
      <Card variant="elevated" className="max-w-md w-full">
        <CardBody className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-warning-light flex items-center justify-center">
            <FileQuestion className="w-8 h-8 text-warning-dark" />
          </div>

          <h1 className="text-h3 font-heading font-bold text-foreground mb-2">
            Page Not Found
          </h1>

          <p className="text-foreground-muted mb-6">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button
                variant="primary"
                leftIcon={<Home className="w-4 h-4" />}
              >
                Go Home
              </Button>
            </Link>
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
