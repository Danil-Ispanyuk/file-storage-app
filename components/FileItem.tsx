"use client";

import { useState } from "react";
import { formatFileSize } from "@/utils/formatFileSize";
import { formatDate } from "@/utils/formatDate";
import { Button } from "@/components/ui/button";
import { ShareDialog } from "./ShareDialog";
import { ShareManagementDialog } from "./ShareManagementDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { PreviewDialog } from "./PreviewDialog";
import { supportsPreview } from "@/lib/filePreview";

type FileItemProps = {
  file: {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    createdAt: string | Date;
  };
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
  isDownloading?: boolean;
};

export function FileItem({
  file,
  onDownload,
  onDelete,
  isDownloading = false,
}: FileItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showShareManagementDialog, setShowShareManagementDialog] =
    useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  const canPreview = supportsPreview(file.mimeType);

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDelete(file.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
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

  return (
    <div className="border-border hover:bg-accent flex items-center justify-between rounded-lg border p-4 transition-colors">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span className="flex-shrink-0 text-2xl">
          {getFileIcon(file.mimeType)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{file.name}</h3>
          <div className="text-muted-foreground flex gap-4 text-sm">
            <span>{formatFileSize(file.size)}</span>
            <span>•</span>
            <span>{formatDate(file.createdAt)}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {canPreview && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreviewDialog(true)}
            disabled={isDeleting || isDownloading}
          >
            Preview
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowShareManagementDialog(true)}
          disabled={isDeleting || isDownloading}
        >
          Manage Shares
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDownload(file.id)}
          disabled={isDeleting || isDownloading}
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
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="text-destructive hover:text-destructive"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </div>
      {showShareManagementDialog && (
        <ShareManagementDialog
          fileId={file.id}
          fileName={file.name}
          onClose={() => setShowShareManagementDialog(false)}
          onShareClick={() => {
            setShowShareManagementDialog(false);
            setShowShareDialog(true);
          }}
        />
      )}
      {showShareDialog && (
        <ShareDialog
          fileId={file.id}
          fileName={file.name}
          mimeType={file.mimeType}
          onClose={() => setShowShareDialog(false)}
          onShareSuccess={() => {
            setShowShareDialog(false);
            setShowShareManagementDialog(true); // Show management dialog after successful share
          }}
        />
      )}
      {showDeleteDialog && (
        <DeleteConfirmDialog
          fileName={file.name}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isDeleting={isDeleting}
        />
      )}
      {showPreviewDialog && (
        <PreviewDialog
          fileId={file.id}
          fileName={file.name}
          mimeType={file.mimeType}
          permission="READ_WRITE" // Owner always has READ_WRITE
          onClose={() => setShowPreviewDialog(false)}
        />
      )}
    </div>
  );
}
