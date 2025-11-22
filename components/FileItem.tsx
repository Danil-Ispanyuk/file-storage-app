"use client";

import { useState } from "react";
import { formatFileSize } from "@/utils/formatFileSize";
import { formatDate } from "@/utils/formatDate";
import { Button } from "@/components/ui/button";

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
};

export function FileItem({ file, onDownload, onDelete }: FileItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${file.name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(file.id);
    } finally {
      setIsDeleting(false);
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDownload(file.id)}
          disabled={isDeleting}
        >
          Download
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-destructive hover:text-destructive"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </div>
  );
}
