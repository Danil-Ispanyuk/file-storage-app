"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { StepUpDialog } from "@/components/StepUpDialog";
import { supportsPreview } from "@/lib/filePreview";

type ShareDialogProps = {
  fileId: string;
  fileName: string;
  mimeType: string;
  onClose: () => void;
  onShareSuccess?: () => void;
};

type ShareType = "public" | "private";

export function ShareDialog({
  fileId,
  fileName,
  mimeType,
  onClose,
}: ShareDialogProps) {
  const canPreview = supportsPreview(mimeType);
  const [shareType, setShareType] = useState<ShareType>(
    canPreview ? "public" : "private",
  );
  const [sharedWith, setSharedWith] = useState("");
  const [permission, setPermission] = useState<"READ" | "READ_WRITE">(
    canPreview ? "READ" : "READ_WRITE",
  );
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareResult, setShareResult] = useState<{
    id?: string;
    token?: string;
    publicUrl?: string;
    permission?: string;
    expiresAt?: string | null;
  } | null>(null);
  const [showStepUp, setShowStepUp] = useState(false);
  const [stepUpToken, setStepUpToken] = useState<string | null>(null);

  const performShare = async (token?: string) => {
    setLoading(true);
    setError(null);
    setShareResult(null);

    try {
      // Validate private share
      if (shareType === "private" && !sharedWith.trim()) {
        setError("Please enter a user ID or email");
        setLoading(false);
        return;
      }

      const body: {
        permission: "READ" | "READ_WRITE";
        public: boolean;
        sharedWith?: string;
        expiresAt?: string;
        stepUpToken?: string;
      } = {
        permission,
        public: shareType === "public",
      };

      if (shareType === "private") {
        body.sharedWith = sharedWith.trim();
      }

      if (expiresAt) {
        body.expiresAt = new Date(expiresAt).toISOString();
      }

      // Add step-up token if available
      if (token) {
        body.stepUpToken = token;
      }

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["X-Step-Up-Token"] = token;
      }

      const response = await fetch(`/api/files/${fileId}/share`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Check if step-up authentication is required
        if (responseData.stepUpRequired) {
          setShowStepUp(true);
          setLoading(false);
          setError(null); // Clear any previous errors
          return;
        }

        throw new Error(responseData.message || "Failed to share file");
      }

      // Success!
      console.log("Share response:", responseData); // Debug log
      setShareResult(responseData.share);
      setStepUpToken(null); // Clear token after successful share
      setError(null);

      // Don't close dialog automatically - let user see the share link
      // onShareSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share file");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    performShare(stepUpToken || undefined);
  };

  const handleStepUpSuccess = (token: string) => {
    setStepUpToken(token);
    setShowStepUp(false);
    // Automatically retry share with step-up token
    performShare(token);
  };

  const handleStepUpCancel = () => {
    setShowStepUp(false);
    setError(
      "Sharing cancelled. Step-up authentication is required for public sharing.",
    );
  };

  return (
    <>
      {showStepUp && (
        <StepUpDialog
          onSuccess={handleStepUpSuccess}
          onCancel={handleStepUpCancel}
          title="Additional Authentication Required"
          message="Please enter your 2FA code to share this file."
        />
      )}
      <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Share &quot;{fileName}&quot;
            </h2>
            <Button variant="outline" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Share Type</Label>
              <div className="mt-2 flex gap-4">
                <label
                  className={`flex items-center gap-2 ${!canPreview ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <input
                    type="radio"
                    value="public"
                    checked={shareType === "public"}
                    disabled={!canPreview}
                    onChange={(e) => setShareType(e.target.value as ShareType)}
                  />
                  <span>Public Link</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="private"
                    checked={shareType === "private"}
                    onChange={(e) => setShareType(e.target.value as ShareType)}
                  />
                  <span>Private (User)</span>
                </label>
              </div>
              {!canPreview && (
                <p className="text-muted-foreground mt-2 text-xs">
                  Public Link is only available for files that support preview
                  (PDF, images, video, audio, text). If you want to share your
                  file with view-only access (no download), we recommend
                  converting it to PDF format.
                </p>
              )}
            </div>

            {shareType === "private" && (
              <div>
                <Label htmlFor="sharedWith">User ID or Email</Label>
                <Input
                  id="sharedWith"
                  type="text"
                  placeholder="Enter user ID or email"
                  value={sharedWith}
                  onChange={(e) => setSharedWith(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label htmlFor="permission">Permission</Label>
              <select
                id="permission"
                value={permission}
                disabled={!canPreview}
                onChange={(e) =>
                  setPermission(e.target.value as "READ" | "READ_WRITE")
                }
                className="border-border bg-background text-foreground mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="READ">Read Only (view only, no download)</option>
                <option value="READ_WRITE">
                  Read &amp; Write (view and download)
                </option>
              </select>
              {!canPreview && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Files that don&apos;t support preview can only be shared with
                  Read &amp; Write permission (download only). To enable
                  view-only sharing, convert your file to PDF format.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="expiresAt">Expires At (Optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="mt-1"
              />
            </div>

            {error && <div className="text-destructive text-sm">{error}</div>}

            {shareResult && (
              <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                <div className="flex items-center gap-2">
                  <span className="text-lg text-green-600 dark:text-green-400">
                    ✓
                  </span>
                  <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                    Share created successfully!
                  </p>
                </div>

                {shareResult.publicUrl && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Public Share Link:
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={shareResult.publicUrl}
                        readOnly
                        className="flex-1 border-gray-300 bg-white font-mono text-xs dark:border-gray-600 dark:bg-gray-800"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Open in viewer page instead of direct API endpoint
                          window.open(shareResult.publicUrl!, "_blank");
                        }}
                        className="whitespace-nowrap"
                        title="View file in browser"
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        onClick={async (e) => {
                          try {
                            await navigator.clipboard.writeText(
                              shareResult.publicUrl!,
                            );
                            // Show temporary success feedback
                            const btn = e.currentTarget;
                            const originalText = btn.textContent;
                            btn.textContent = "Copied!";
                            btn.classList.add("bg-green-600");
                            setTimeout(() => {
                              if (btn.textContent === "Copied!") {
                                btn.textContent = originalText;
                                btn.classList.remove("bg-green-600");
                              }
                            }, 2000);
                          } catch (err) {
                            console.error("Failed to copy:", err);
                          }
                        }}
                        className="whitespace-nowrap"
                      >
                        Copy
                      </Button>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Anyone with this link can view the file in browser
                    </p>
                    {shareResult.permission && (
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Permission:{" "}
                        {shareResult.permission === "READ"
                          ? "Read Only (view only, no download)"
                          : "Read & Write (view and download)"}
                      </p>
                    )}
                    {shareResult.expiresAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Expires:{" "}
                        {new Date(shareResult.expiresAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {shareResult.token && !shareResult.publicUrl && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Share Token:</Label>
                    <div className="flex gap-2">
                      <Input
                        value={shareResult.token}
                        readOnly
                        className="border-gray-300 bg-white font-mono text-xs dark:border-gray-600 dark:bg-gray-800"
                      />
                      <Button
                        size="sm"
                        onClick={async (e) => {
                          try {
                            await navigator.clipboard.writeText(
                              shareResult.token!,
                            );
                            const btn = e.currentTarget;
                            const originalText = btn.textContent;
                            btn.textContent = "Copied!";
                            btn.classList.add("bg-green-600");
                            setTimeout(() => {
                              if (btn.textContent === "Copied!") {
                                btn.textContent = originalText;
                                btn.classList.remove("bg-green-600");
                              }
                            }, 2000);
                          } catch (err) {
                            console.error("Failed to copy:", err);
                          }
                        }}
                        className="whitespace-nowrap"
                      >
                        Copy Token
                      </Button>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      File has been shared with the specified user
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleShare} disabled={loading}>
                {loading ? "Sharing..." : "Share"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
