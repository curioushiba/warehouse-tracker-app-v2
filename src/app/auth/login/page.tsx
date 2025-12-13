"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AtSign, Lock, AlertCircle } from "lucide-react";
import {
  Card,
  CardBody,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Alert,
  Checkbox,
  Divider,
} from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { signIn, getCurrentUser } from "@/lib/actions";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<{
    identifier?: string;
    password?: string;
  }>({});

  const validateForm = () => {
    const newErrors: { identifier?: string; password?: string } = {};

    if (!identifier.trim()) {
      newErrors.identifier = "Username or email is required";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
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
      const result = await signIn(identifier, password);

      if (!result.success) {
        setError(result.error || "Invalid username/email or password. Please try again.");
        setIsLoading(false);
        return;
      }

      // Get user profile to determine role-based routing
      const userResult = await getCurrentUser();

      if (userResult.success && userResult.data?.profile) {
        const role = userResult.data.profile.role;
        if (role === "admin") {
          router.push("/admin");
        } else {
          router.push("/employee");
        }
      } else {
        // Default to employee if no profile found
        router.push("/employee");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    }

    setIsLoading(false);
  };

  return (
    <Card variant="elevated" className="shadow-lg">
      <CardBody className="p-6">
        <div className="text-center mb-6">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Welcome Back
          </h2>
          <p className="text-sm text-foreground-muted mt-1">
            Sign in to your account to continue
          </p>
        </div>

        {error && (
          <Alert status="error" variant="subtle" className="mb-6">
            <AlertCircle className="w-4 h-4" />
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormControl isInvalid={!!errors.identifier}>
            <FormLabel>Username or Email</FormLabel>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
              <Input
                type="text"
                placeholder="Enter username or email"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (errors.identifier) setErrors({ ...errors, identifier: undefined });
                }}
                className="pl-10"
                autoComplete="username"
              />
            </div>
            {errors.identifier && (
              <FormErrorMessage>{errors.identifier}</FormErrorMessage>
            )}
          </FormControl>

          <FormControl isInvalid={!!errors.password}>
            <FormLabel>Password</FormLabel>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password)
                    setErrors({ ...errors, password: undefined });
                }}
                className="pl-10 pr-10"
                autoComplete="current-password"
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

          <div className="flex items-center justify-between">
            <Checkbox
              isChecked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              label="Remember me"
              size="sm"
            />
            <Link
              href="/auth/forgot-password"
              className="text-sm text-primary font-medium hover:text-primary-dark transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="cta"
            size="lg"
            isFullWidth
            isLoading={isLoading}
          >
            Sign In
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-foreground-muted">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="text-primary font-medium hover:text-primary-dark transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
