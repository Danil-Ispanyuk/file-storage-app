"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

type SetupState =
  | "loading" // Checking if 2FA is enabled
  | "not-setup" // 2FA not setup, show setup button
  | "generating" // Generating QR code
  | "verifying" // Waiting for user to verify code
  | "enabled" // 2FA is enabled
  | "show-backup-codes"; // Show backup codes after enabling

function TwoFactorSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMandatory = searchParams.get("mandatory") === "true";
  const [state, setState] = useState<SetupState>("loading");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const check2FAStatus = useCallback(async () => {
    try {
      // We'll need to get user's 2FA status from an API endpoint
      // For now, try to fetch from the setup endpoint which requires auth
      const response = await fetch("/api/auth/2fa/setup", {
        method: "GET", // We'll need to create a GET endpoint to check status
      });

      if (response.status === 401) {
        router.replace("/auth/login");
        return;
      }

      // If GET doesn't exist, we'll handle it in the setup flow
      setState("not-setup");
    } catch {
      setState("not-setup");
    }
  }, [router]);

  // Check if 2FA is already enabled
  useEffect(() => {
    check2FAStatus();
  }, [check2FAStatus]);

  async function handleSetup() {
    setError(null);
    setIsSubmitting(true);
    setState("generating");

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
        setState("not-setup");
        return;
      }

      const data = await response.json();

      if (data.success) {
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setState("verifying");
      } else {
        setError(data?.message ?? "Failed to generate 2FA setup.");
        setState("not-setup");
      }
    } catch {
      setError("Failed to generate 2FA setup. Please try again.");
      setState("not-setup");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify() {
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
          setState("show-backup-codes");
        } else {
          setState("enabled");
          // If mandatory, redirect to home after a short delay
          if (isMandatory) {
            setTimeout(() => {
              router.replace("/");
            }, 2000);
          }
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

  function handleContinue() {
    setState("enabled");
    // If mandatory, redirect to home after saving backup codes
    if (isMandatory) {
      setTimeout(() => {
        router.replace("/");
      }, 1000);
    }
  }

  return (
    <main className="bg-background text-foreground mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-12">
      <header>
        <h1 className="text-2xl font-semibold">Two-Factor Authentication</h1>
        <p className="text-muted-foreground mt-2">
          {isMandatory
            ? "Two-factor authentication is required to use your account. Please set it up now."
            : "Secure your account with an additional layer of protection."}
        </p>
        {isMandatory && (
          <div className="bg-muted border-border mt-4 rounded-md border p-3">
            <p className="text-sm font-medium text-yellow-600">
              ⚠️ 2FA Setup Required
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              You must set up two-factor authentication before you can access
              your account.
            </p>
          </div>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            {state === "enabled" || state === "show-backup-codes"
              ? "2FA Enabled"
              : state === "verifying"
                ? "Verify Setup"
                : "Setup 2FA"}
          </CardTitle>
          <CardDescription>
            {state === "enabled" || state === "show-backup-codes"
              ? "Two-factor authentication is enabled for your account."
              : state === "verifying"
                ? "Scan the QR code and enter the 6-digit code to complete setup."
                : "Add an extra layer of security to your account."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {state === "loading" && (
            <p className="text-muted-foreground text-center">Loading...</p>
          )}

          {state === "not-setup" && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Two-factor authentication (2FA) adds an extra layer of security
                to your account. After enabling 2FA, you&apos;ll need to enter a
                code from your authenticator app in addition to your password
                when signing in.
              </p>
              {error && (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              )}
              <Button
                onClick={handleSetup}
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? "Generating..." : "Enable 2FA"}
              </Button>
            </div>
          )}

          {state === "generating" && (
            <p className="text-muted-foreground text-center">
              Generating QR code...
            </p>
          )}

          {state === "verifying" && qrCode && secret && (
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
                  Enter 6-digit code to verify:
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
                />
              </div>

              {error && (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              )}

              <Button
                onClick={handleVerify}
                disabled={isSubmitting || verificationCode.length !== 6}
                className="w-full"
              >
                {isSubmitting ? "Verifying..." : "Verify & Enable"}
              </Button>
            </div>
          )}

          {state === "show-backup-codes" && backupCodes.length > 0 && (
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
              <Button onClick={handleContinue} className="w-full">
                I&apos;ve saved my backup codes
              </Button>
            </div>
          )}

          {state === "enabled" && (
            <div className="space-y-4">
              <div className="bg-muted border-border rounded-md border p-4">
                <p className="font-semibold text-green-600">
                  ✓ Two-factor authentication is enabled
                </p>
                <p className="text-muted-foreground mt-2 text-sm">
                  Your account is now protected with 2FA. You&apos;ll need to
                  enter a code from your authenticator app when signing in.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function TwoFactorSettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TwoFactorSettingsContent />
    </Suspense>
  );
}
