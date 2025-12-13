"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardBody,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Alert,
} from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { requestPasswordReset } from "@/lib/actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const result = await requestPasswordReset(email);

      if (!result.success) {
        setError(result.error || "Failed to send reset email. Please try again.");
        setIsLoading(false);
        return;
      }

      setIsSubmitted(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    }

    setIsLoading(false);
  };

  if (isSubmitted) {
    return (
      <Card variant="elevated" className="shadow-lg">
        <CardBody className="p-6 text-center">
          <div className="w-16 h-16 bg-success-light rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
            Check Your Email
          </h2>
          <p className="text-sm text-foreground-muted mb-6">
            We&apos;ve sent a password reset link to{" "}
            <strong className="text-foreground">{email}</strong>
          </p>
          <p className="text-xs text-foreground-muted mb-6">
            Didn&apos;t receive the email? Check your spam folder or try again.
          </p>
          <div className="space-y-3">
            <Button
              variant="primary"
              isFullWidth
              onClick={() => setIsSubmitted(false)}
            >
              Resend Email
            </Button>
            <Link href="/auth/login">
              <Button
                variant="ghost"
                isFullWidth
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to Sign In
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="shadow-lg">
      <CardBody className="p-6">
        <div className="text-center mb-6">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Forgot Password?
          </h2>
          <p className="text-sm text-foreground-muted mt-1">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        {error && (
          <Alert status="error" variant="subtle" className="mb-6">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormControl isInvalid={!!error}>
            <FormLabel>Email Address</FormLabel>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                className="pl-10"
                autoComplete="email"
              />
            </div>
          </FormControl>

          <Button
            type="submit"
            variant="cta"
            size="lg"
            isFullWidth
            isLoading={isLoading}
          >
            Send Reset Link
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/auth/login">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Sign In
            </Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
