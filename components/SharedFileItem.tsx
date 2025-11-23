"use client";

import { useState } from "react";
import { formatFileSize } from "@/utils/formatFileSize";
import { formatDate } from "@/utils/formatDate";
import { Button } from "@/components/ui/button";
import { PreviewDialog } from "./PreviewDialog";
import { supportsPreview } from "@/lib/filePreview";

type SharedFileItemProps = {
  file: {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    createdAt: string | Date;
    sharedBy: {
      id: string;
      email: string;
      name: string | null;
    };
    permission: "READ" | "READ_WRITE";
    shareId: string;
    expiresAt: string | Date | null;
    shareCreatedAt: string | Date;
  };
  onDownload: (id: string) => void;
  onRemove?: (shareId: string) => void;
  isDownloading?: boolean;
};

export function SharedFileItem({
  file,
  onDownload,
  onRemove,
  isDownloading = false,
}: SharedFileItemProps) {
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const canPreview = supportsPreview(file.mimeType);
  const canDownload = file.permission === "READ_WRITE";

  const handleRemove = async () => {
    if (!onRemove) return;

    if (!confirm(`Are you sure you want to remove access to "${file.name}"?`)) {
      return;
    }

    setIsRemoving(true);
    try {
      await onRemove(file.shareId);
    } catch (error) {
      console.error("Remove error:", error);
      alert("Failed to remove shared file");
    } finally {
      setIsRemoving(false);
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

  const isExpired = file.expiresAt
    ? new Date(file.expiresAt) < new Date()
    : false;

  return (
    <>
      <div className="border-border hover:bg-accent flex items-center justify-between rounded-lg border p-4 transition-colors">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="flex-shrink-0 text-2xl">
            {getFileIcon(file.mimeType)}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium">{file.name}</h3>
            <div className="text-muted-foreground flex flex-wrap gap-2 text-sm">
              <span>{formatFileSize(file.size)}</span>
              <span>•</span>
              <span>{formatDate(file.createdAt)}</span>
              <span>•</span>
              <span className="text-primary">
                Shared by {file.sharedBy.name || file.sharedBy.email}
              </span>
              {file.expiresAt && (
                <>
                  <span>•</span>
                  <span className={isExpired ? "text-destructive" : ""}>
                    Expires: {formatDate(file.expiresAt)}
                  </span>
                </>
              )}
              {file.permission === "READ" && (
                <>
                  <span>•</span>
                  <span className="text-muted-foreground">Read Only</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {canPreview && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreviewDialog(true)}
              disabled={isRemoving || isDownloading}
            >
              Preview
            </Button>
          )}
          {canDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(file.id)}
              disabled={isRemoving || isDownloading}
              className="relative"
            >
              {isDownloading ? (
                <span className="flex items-center gap-2">
                  <div className="relative h-4 w-4">
                    <div className="absolute inset-0 animate-spin rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                    <div className="border-t-primary absolute inset-0 animate-spin rounded-full border-2 border-transparent"></div>
                  </div>
                  Downloading...
                </span>
              ) : (
                "Download"
              )}
            </Button>
          )}
          {onRemove && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={isRemoving || isDownloading}
              className="text-destructive hover:text-destructive"
            >
              {isRemoving ? "Removing..." : "Remove"}
            </Button>
          )}
        </div>
      </div>
      {showPreviewDialog && (
        <PreviewDialog
          fileId={file.id}
          fileName={file.name}
          mimeType={file.mimeType}
          permission={file.permission}
          onClose={() => setShowPreviewDialog(false)}
        />
      )}
    </>
  );
}
