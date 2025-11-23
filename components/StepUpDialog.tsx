"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

type StepUpDialogProps = {
  onSuccess: (token: string) => void;
  onCancel: () => void;
  title?: string;
  message?: string;
};

export function StepUpDialog({
  onSuccess,
  onCancel,
  title = "Additional Authentication Required",
  message = "Please enter your 2FA code to continue with this action.",
}: StepUpDialogProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/step-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Step-up authentication failed");
      }

      if (data.success && data.token) {
        onSuccess(data.token);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify code");
      setLoading(false);
    }
  };

  return (
    <div className="bg-background/80 fixed inset-0 z-[60] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-muted-foreground mt-2 text-sm">{message}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="code">2FA Code</Label>
            <Input
              id="code"
              type="text"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(value);
              }}
              maxLength={6}
              disabled={loading}
              className="mt-1 font-mono text-lg tracking-widest"
              autoFocus
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          {error && <div className="text-destructive text-sm">{error}</div>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || code.length !== 6}>
              {loading ? "Verifying..." : "Verify"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
