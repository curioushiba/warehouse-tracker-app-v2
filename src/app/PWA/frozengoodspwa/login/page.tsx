"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, User, Lock, AlertCircle, Snowflake } from "lucide-react";
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
import { signInEmployee } from "@/lib/actions";

export default function FrozenGoodsLoginPage() {
  const router = useRouter();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<{
    username?: string;
    password?: string;
  }>({});

  const validateForm = () => {
    const newErrors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      newErrors.username = "Username is required";
    }

    if (!password) {
      newErrors.password = "Password is required";
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
      const result = await signInEmployee(username, password);

      if (!result.success) {
        setError(result.error || "Invalid username or password.");
        setIsLoading(false);
        return;
      }

      router.push("/PWA/frozengoodspwa");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f8ff] p-4">
      <div className="w-full max-w-md">
        <Card variant="elevated" className="shadow-lg">
          <CardBody className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#0077b6] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Snowflake className="w-9 h-9 text-white" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Frozen Goods
              </h2>
              <p className="text-sm text-foreground-muted mt-1">
                Log in to manage frozen inventory
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
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                  <Input
                    type="text"
                    placeholder="Enter your username"
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
                      if (errors.password) setErrors({ ...errors, password: undefined });
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

              <Button
                type="submit"
                variant="cta"
                size="lg"
                isFullWidth
                isLoading={isLoading}
                className="!bg-[#0077b6] hover:!bg-[#005f8a]"
              >
                Sign In
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
