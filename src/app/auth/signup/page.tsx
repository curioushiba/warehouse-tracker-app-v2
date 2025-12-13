"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, User, AtSign, AlertCircle, CheckCircle } from "lucide-react";
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
import { signUp } from "@/lib/actions";

export default function SignUpPage() {
  const router = useRouter();
  const [username, setUsername] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [errors, setErrors] = React.useState<{
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = "Username can only contain letters, numbers, and underscores";
    }

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
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
      const result = await signUp(username, email, password, firstName, lastName);

      if (!result.success) {
        setError(result.error || "Failed to create account. Please try again.");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    }

    setIsLoading(false);
  };

  if (success) {
    return (
      <Card variant="elevated" className="shadow-lg">
        <CardBody className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
              Account Created!
            </h2>
            <p className="text-sm text-foreground-muted mb-4">
              Your account has been created successfully. Redirecting to login...
            </p>
            <Link
              href="/auth/login"
              className="text-primary font-medium hover:text-primary-dark transition-colors"
            >
              Go to Login
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
            Create Account
          </h2>
          <p className="text-sm text-foreground-muted mt-1">
            Sign up to get started with Inventory Tracker
          </p>
        </div>

        {error && (
          <Alert status="error" variant="subtle" className="mb-6">
            <AlertCircle className="w-4 h-4" />
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormControl isInvalid={!!errors.username}>
            <FormLabel>Username</FormLabel>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
              <Input
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase());
                  if (errors.username) setErrors({ ...errors, username: undefined });
                }}
                className="pl-10"
                autoComplete="username"
              />
            </div>
            {errors.username && (
              <FormErrorMessage>{errors.username}</FormErrorMessage>
            )}
          </FormControl>

          <div className="grid grid-cols-2 gap-4">
            <FormControl isInvalid={!!errors.firstName}>
              <FormLabel>First Name</FormLabel>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                <Input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (errors.firstName) setErrors({ ...errors, firstName: undefined });
                  }}
                  className="pl-10"
                  autoComplete="given-name"
                />
              </div>
              {errors.firstName && (
                <FormErrorMessage>{errors.firstName}</FormErrorMessage>
              )}
            </FormControl>

            <FormControl isInvalid={!!errors.lastName}>
              <FormLabel>Last Name</FormLabel>
              <Input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (errors.lastName) setErrors({ ...errors, lastName: undefined });
                }}
                autoComplete="family-name"
              />
              {errors.lastName && (
                <FormErrorMessage>{errors.lastName}</FormErrorMessage>
              )}
            </FormControl>
          </div>

          <FormControl isInvalid={!!errors.email}>
            <FormLabel>Email Address</FormLabel>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                className="pl-10"
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <FormErrorMessage>{errors.email}</FormErrorMessage>
            )}
          </FormControl>

          <FormControl isInvalid={!!errors.password}>
            <FormLabel>Password</FormLabel>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: undefined });
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

          <FormControl isInvalid={!!errors.confirmPassword}>
            <FormLabel>Confirm Password</FormLabel>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                }}
                className="pl-10"
                autoComplete="new-password"
              />
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
          >
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-foreground-muted">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-primary font-medium hover:text-primary-dark transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
