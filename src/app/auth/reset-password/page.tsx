"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Card,
  CardBody,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Alert,
} from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { updatePassword } from "@/lib/actions";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const passwordRequirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter", met: /[a-z]/.test(password) },
    { label: "One number", met: /\d/.test(password) },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.met);

  const validateForm = () => {
    const newErrors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      newErrors.password = "Password is required";
    } else if (!allRequirementsMet) {
      newErrors.password = "Password does not meet all requirements";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const result = await updatePassword(password);

      if (!result.success) {
        setError(result.error || "Failed to update password. Please try again.");
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
            Password Reset Complete
          </h2>
          <p className="text-sm text-foreground-muted mb-6">
            Your password has been successfully reset. You can now sign in with
            your new password.
          </p>
          <Link href="/auth/login">
            <Button variant="cta" size="lg" isFullWidth>
              Sign In
            </Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="shadow-lg">
      <CardBody className="p-6">
        <div className="text-center mb-6">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Reset Password
          </h2>
          <p className="text-sm text-foreground-muted mt-1">
            Create a new password for your account
          </p>
        </div>

        {error && (
          <Alert status="error" variant="subtle" className="mb-6">
            <AlertCircle className="w-4 h-4" />
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormControl isInvalid={!!errors.password}>
            <FormLabel>New Password</FormLabel>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password)
                    setErrors({ ...errors, password: undefined });
                }}
                className="pl-10 pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <FormErrorMessage>{errors.password}</FormErrorMessage>
            )}
          </FormControl>

          {/* Password Requirements */}
          <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-foreground-muted mb-2">
              Password Requirements:
            </p>
            {passwordRequirements.map((req) => (
              <div
                key={req.label}
                className="flex items-center gap-2 text-xs"
              >
                {req.met ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : (
                  <div className="w-4 h-4 border-2 border-foreground-placeholder rounded-full" />
                )}
                <span
                  className={
                    req.met ? "text-success" : "text-foreground-muted"
                  }
                >
                  {req.label}
                </span>
              </div>
            ))}
          </div>

          <FormControl isInvalid={!!errors.confirmPassword}>
            <FormLabel>Confirm Password</FormLabel>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword)
                    setErrors({ ...errors, confirmPassword: undefined });
                }}
                className="pl-10 pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
            )}
          </FormControl>

          <Button
            type="submit"
            variant="cta"
            size="lg"
            isFullWidth
            isLoading={isLoading}
            disabled={!allRequirementsMet}
          >
            Reset Password
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
