"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
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

type RegistrationStep =
  | "register" // Step 1: Email, password, name
  | "generating-2fa" // Step 2: Generating QR code
  | "verify-2fa" // Step 3: Enter 2FA code
  | "backup-codes"; // Step 4: Show backup codes

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<RegistrationStep>("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Step 1: Register user
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data?.message ?? "Registration failed.");
        return;
      }

      // Step 2: Auto sign-in to get session
      const signInResult = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (signInResult?.error) {
        setError(
          "Registration succeeded but sign-in failed. Please login manually.",
        );
        router.replace("/auth/login");
        return;
      }

      // Step 3: Generate 2FA setup
      setStep("generating-2fa");
      await handleGenerate2FA();
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGenerate2FA() {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/auth/login");
          return;
        }
        const data = await response.json().catch(() => ({}));
        setError(data?.message ?? "Failed to generate 2FA setup.");
        setStep("register");
        return;
      }

      const data = await response.json();

      if (data.success) {
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setStep("verify-2fa");
      } else {
        setError(data?.message ?? "Failed to generate 2FA setup.");
        setStep("register");
      }
    } catch {
      setError("Failed to generate 2FA setup. Please try again.");
      setStep("register");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify2FA() {
    setError(null);
    setIsSubmitting(true);

    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit code.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: verificationCode,
          isLogin: false,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/auth/login");
          return;
        }
        const data = await response.json().catch(() => ({}));
        setError(data?.message ?? "Invalid code. Please try again.");
        return;
      }

      const data = await response.json();

      if (data.success) {
        if (data.backupCodes && Array.isArray(data.backupCodes)) {
          setBackupCodes(data.backupCodes);
          setStep("backup-codes");
        } else {
          // If no backup codes, complete registration
          await handleCompleteRegistration();
        }
      } else {
        setError(data?.message ?? "Invalid code. Please try again.");
      }
    } catch {
      setError("Failed to verify code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCompleteRegistration() {
    // Registration complete - refresh and redirect to home
    router.refresh();
    router.replace("/");
  }

  return (
    <main className="bg-background text-foreground mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>
            {step === "register"
              ? "Create account"
              : step === "generating-2fa"
                ? "Setting up 2FA"
                : step === "verify-2fa"
                  ? "Verify 2FA"
                  : "Save backup codes"}
          </CardTitle>
          <CardDescription>
            {step === "register"
              ? "Sign up to get started. 2FA setup is required."
              : step === "generating-2fa"
                ? "Generating your 2FA setup..."
                : step === "verify-2fa"
                  ? "Scan the QR code and enter the 6-digit code to complete registration."
                  : "Save these backup codes in a safe place."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Registration Form */}
          {step === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 12 characters"
                  required
                  disabled={isSubmitting}
                />
                <p className="text-muted-foreground text-xs">
                  Password must be 12-128 characters.
                </p>
              </div>
              {error && (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Creating..." : "Continue"}
              </Button>
              <p className="text-muted-foreground pt-2 text-center text-sm">
                Already have an account?{" "}
                <a className="text-primary underline" href="/auth/login">
                  Sign in
                </a>
              </p>
            </form>
          )}

          {/* Step 2: Generating 2FA */}
          {step === "generating-2fa" && (
            <div className="space-y-4">
              <p className="text-muted-foreground text-center">
                Generating your 2FA setup...
              </p>
            </div>
          )}

          {/* Step 3: Verify 2FA */}
          {step === "verify-2fa" && qrCode && secret && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Scan this QR code with your authenticator app:</Label>
                <div className="flex justify-center">
                  <Image
                    src={qrCode || ""}
                    alt="2FA QR Code"
                    width={300}
                    height={300}
                    className="border-border rounded-md border p-4"
                    unoptimized
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Or enter this secret manually (if QR code doesn&apos;t work):
                </Label>
                <div className="bg-muted border-border rounded-md border p-3 font-mono text-sm">
                  {secret}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verificationCode">
                  Enter 6-digit code to complete registration:
                </Label>
                <Input
                  id="verificationCode"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  pattern="\d{6}"
                  inputMode="numeric"
                  className="text-center text-lg tracking-widest"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              )}

              <Button
                onClick={handleVerify2FA}
                disabled={isSubmitting || verificationCode.length !== 6}
                className="w-full"
              >
                {isSubmitting ? "Verifying..." : "Verify & Complete"}
              </Button>
            </div>
          )}

          {/* Step 4: Backup Codes */}
          {step === "backup-codes" && backupCodes.length > 0 && (
            <div className="space-y-4">
              <div className="bg-muted border-border rounded-md border p-4">
                <p className="mb-3 font-semibold">
                  ⚠️ Save these backup codes in a safe place
                </p>
                <p className="text-muted-foreground mb-4 text-sm">
                  These codes can be used to access your account if you lose
                  access to your authenticator app. Each code can only be used
                  once.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="bg-background border-border rounded border p-2 text-center font-mono text-sm"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={handleCompleteRegistration} className="w-full">
                I&apos;ve saved my backup codes - Continue
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
