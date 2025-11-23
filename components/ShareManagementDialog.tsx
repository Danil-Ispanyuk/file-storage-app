"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Share = {
  id: string;
  sharedWith: string | null;
  sharedBy: string;
  permission: "READ" | "READ_WRITE";
  expiresAt: string | Date | null;
  createdAt: string | Date;
  sharedWithUser?: {
    email: string;
    name: string | null;
  } | null;
};

type ShareManagementDialogProps = {
  fileId: string;
  fileName: string;
  onClose: () => void;
  onShareClick: () => void;
};

export function ShareManagementDialog({
  fileId,
  fileName,
  onClose,
  onShareClick,
}: ShareManagementDialogProps) {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchShares = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/files/${fileId}/shares`);
        if (!response.ok) {
          throw new Error("Failed to fetch shares");
        }
        const data = await response.json();
        setShares(data.shares || []);
      } catch (err) {
        console.error("Error fetching shares:", err);
        setError(err instanceof Error ? err.message : "Failed to load shares");
      } finally {
        setLoading(false);
      }
    };

    fetchShares();
  }, [fileId]);

  const handleRevoke = async (shareId: string) => {
    if (!confirm("Are you sure you want to revoke this share?")) {
      return;
    }

    setRevokingId(shareId);
    try {
      const response = await fetch(`/api/files/${fileId}/share/${shareId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to revoke share");
      }

      // Remove from list
      setShares(shares.filter((s) => s.id !== shareId));
    } catch (err) {
      console.error("Error revoking share:", err);
      alert(err instanceof Error ? err.message : "Failed to revoke share");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4">
      <Card className="flex max-h-[80vh] w-full max-w-2xl flex-col">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">
            Manage Shares for &quot;{fileName}&quot;
          </h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-auto p-4">
          {loading && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Loading shares...</p>
            </div>
          )}

          {error && (
            <div className="text-destructive py-4 text-center">{error}</div>
          )}

          {!loading && !error && shares.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground mb-4">
                No active shares for this file.
              </p>
              <Button onClick={onShareClick}>Share File</Button>
            </div>
          )}

          {!loading && !error && shares.length > 0 && (
            <>
              <div className="flex justify-end">
                <Button onClick={onShareClick}>Share with Another User</Button>
              </div>
              <div className="space-y-2">
                {shares.map((share) => {
                  const isExpired = share.expiresAt
                    ? new Date(share.expiresAt) < new Date()
                    : false;
                  const isPublic = share.sharedWith === null;

                  return (
                    <div
                      key={share.id}
                      className="border-border rounded-lg border p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">
                            {isPublic ? (
                              <span>Public Link</span>
                            ) : (
                              <span>
                                {share.sharedWithUser?.name ||
                                  share.sharedWithUser?.email ||
                                  "Unknown User"}
                              </span>
                            )}
                          </div>
                          <div className="text-muted-foreground mt-1 space-y-1 text-sm">
                            <div>
                              Permission:{" "}
                              {share.permission === "READ"
                                ? "Read Only (view only, no download)"
                                : "Read & Write (view and download)"}
                            </div>
                            {share.expiresAt && (
                              <div
                                className={isExpired ? "text-destructive" : ""}
                              >
                                Expires:{" "}
                                {new Date(share.expiresAt).toLocaleString()}
                                {isExpired && " (Expired)"}
                              </div>
                            )}
                            {!share.expiresAt && <div>No expiration date</div>}
                            <div>
                              Shared:{" "}
                              {new Date(share.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevoke(share.id)}
                          disabled={revokingId === share.id}
                          className="text-destructive hover:text-destructive"
                        >
                          {revokingId === share.id ? "Revoking..." : "Revoke"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end border-t p-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
