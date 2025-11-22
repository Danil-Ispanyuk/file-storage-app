"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      // If 2FA code is provided, sign in with credentials including TOTP code
      if (requires2FA && totpCode) {
        const result = await signIn("credentials", {
          redirect: false,
          email,
          password,
          totpCode,
        });
        if (result?.error) {
          setError(result.error);
          return;
        }
        router.replace("/");
        router.refresh();
        return;
      }

      // First, check credentials and 2FA status
      const checkResponse = await fetch("/api/auth/check-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const checkData = await checkResponse.json();

      if (!checkData.success) {
        setError(checkData.message ?? "Invalid credentials.");
        return;
      }

      // If 2FA is required, show 2FA input field
      if (checkData.requires2FA) {
        setRequires2FA(true);
        setError("Please enter your 2FA code to continue.");
        return;
      }

      // If no 2FA, sign in directly
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      // After successful login, check if 2FA is enabled
      // If not enabled, redirect to setup (mandatory)
      // The home page will also check this, but we check here to be explicit
      router.replace("/");
      router.refresh();
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="bg-background text-foreground mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                disabled={requires2FA}
              />
            </div>
            {requires2FA && (
              <div className="space-y-2">
                <Label htmlFor="totpCode">2FA Code</Label>
                <Input
                  id="totpCode"
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="000000"
                  required
                  maxLength={8}
                  pattern="\d{6,8}"
                  inputMode="numeric"
                />
                <p className="text-muted-foreground text-xs">
                  Enter the 6-digit code from your authenticator app or an
                  8-digit backup code.
                </p>
              </div>
            )}
            {error && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting
                ? "Signing in..."
                : requires2FA
                  ? "Verify & Sign in"
                  : "Sign in"}
            </Button>
            <p className="text-muted-foreground pt-2 text-center text-sm">
              No account?{" "}
              <a className="text-primary underline" href="/auth/register">
                Register
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
