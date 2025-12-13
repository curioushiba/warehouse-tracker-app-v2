"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AtSign, Lock, AlertCircle } from "lucide-react";
import {
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
    <div className="w-full flex flex-col items-center">
      <div className="text-center mb-8">
        <h2 className="font-heading text-4xl font-bold text-foreground mb-3">
          Admin Log in
        </h2>
        <p className="text-base text-foreground-muted max-w-[250px] mx-auto leading-relaxed">
          Welcome back. Enter your credentials to access the admin portal.
        </p>
      </div>

      {error && (
        <Alert status="error" variant="subtle" className="mb-6 rounded-2xl bg-red-50 text-error border-none animate-in fade-in slide-in-from-top-2 w-full">
          <AlertCircle className="w-5 h-5 text-error" />
          <span className="ml-2 font-medium text-sm">{error}</span>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 w-full">
        {/* Username Input - Clean Style */}
        <div className="space-y-1">
          <div className="relative group">
            <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-placeholder group-focus-within:text-primary transition-colors" />
            <Input
              type="text"
              placeholder="Username or email"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (errors.identifier) setErrors({ ...errors, identifier: undefined });
              }}
              className="pl-12 h-14 rounded-2xl bg-white border-none shadow-sm text-base placeholder:text-foreground-placeholder focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              autoComplete="username"
            />
          </div>
          {errors.identifier && (
            <p className="text-xs text-error pl-4 font-medium animate-in slide-in-from-left-1">{errors.identifier}</p>
          )}
        </div>

        {/* Password Input - Clean Style */}
        <div className="space-y-1">
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-placeholder group-focus-within:text-primary transition-colors" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password)
                  setErrors({ ...errors, password: undefined });
              }}
              className="pl-12 pr-12 h-14 rounded-2xl bg-white border-none shadow-sm text-base placeholder:text-foreground-placeholder focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-placeholder hover:text-primary transition-colors p-1"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-error pl-4 font-medium animate-in slide-in-from-left-1">{errors.password}</p>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="cta"
            size="lg"
            isFullWidth
            isLoading={isLoading}
            className="h-14 rounded-full text-lg font-bold shadow-lg shadow-cta/20 hover:shadow-xl hover:shadow-cta/30 hover:-translate-y-0.5 transition-all active:scale-95 bg-cta text-foreground border-2 border-foreground/10"
          >
            Sign In
          </Button>
        </div>

        <div className="flex items-center justify-center pt-2 gap-4">
          <Link
            href="/auth/forgot-password"
            className="text-sm font-medium text-foreground-muted hover:text-primary transition-colors"
          >
            Forgot Password?
          </Link>
          <span className="text-border">•</span>
          <Link
            href="/auth/signup"
            className="text-sm font-medium text-foreground-muted hover:text-primary transition-colors"
          >
            Create Account
          </Link>
        </div>

      </form>
    </div>
  );
}
