"use client";

import { useState, useEffect } from "react";
import { formatFileSize } from "@/utils/formatFileSize";
import { formatDate } from "@/utils/formatDate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type SharedFile = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string | Date;
  sharedBy: string;
  permission: "READ" | "READ_WRITE";
  shareId: string;
  expiresAt: string | Date | null;
  shareCreatedAt: string | Date;
};

export function SharedFilesList() {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSharedFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/files/shared");
      if (!response.ok) {
        throw new Error("Failed to fetch shared files");
      }
      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedFiles();
  }, []);

  const handleDownload = async (id: string) => {
    try {
      const response = await fetch(`/api/files/${id}/download`);
      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = id;
      if (contentDisposition) {
        // Try to match filename="..." (with quotes)
        let filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (!filenameMatch) {
          // Try to match filename*=UTF-8''... (RFC 5987)
          filenameMatch = contentDisposition.match(
            /filename\*=UTF-8''([^;]+)/i,
          );
        }
        if (!filenameMatch) {
          // Fallback: match filename=... (without quotes)
          filenameMatch = contentDisposition.match(/filename=([^;]+)/i);
        }
        if (filenameMatch) {
          const extractedFilename = filenameMatch[1].trim();
          // Decode URI component
          try {
            filename = decodeURIComponent(extractedFilename);
          } catch {
            // If decoding fails, use as is (remove any trailing underscores that might have been added)
            filename = extractedFilename.replace(/_$/, "");
          }
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download file");
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType.startsWith("text/")) return "📄";
    if (mimeType === "application/pdf") return "📕";
    if (mimeType.includes("word") || mimeType.includes("document")) {
      return "📝";
    }
    if (mimeType.includes("sheet") || mimeType.includes("excel")) {
      return "📊";
    }
    return "📎";
  };

  if (loading) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        Loading shared files...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={fetchSharedFiles}>Retry</Button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">
          No files have been shared with you yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Files Shared With Me</h2>
        <Button variant="outline" onClick={fetchSharedFiles}>
          Refresh
        </Button>
      </div>

      <div className="space-y-2">
        {files.map((file) => (
          <Card key={file.shareId} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <span className="flex-shrink-0 text-2xl">
                  {getFileIcon(file.mimeType)}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium">{file.name}</h3>
                  <div className="text-muted-foreground flex flex-wrap gap-2 text-sm">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>Shared {formatDate(file.shareCreatedAt)}</span>
                    <span>•</span>
                    <span>Permission: {file.permission}</span>
                    {file.expiresAt && (
                      <>
                        <span>•</span>
                        <span>Expires: {formatDate(file.expiresAt)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(file.id)}
                >
                  Download
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
