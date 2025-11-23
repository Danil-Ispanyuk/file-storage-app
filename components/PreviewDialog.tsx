"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import dynamic from "next/dynamic";

// Dynamically import PDFViewer to avoid SSR issues
const PDFViewer = dynamic(
  () =>
    import("../app/shared/view/[token]/PDFViewer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="py-8 text-center">
        <div className="relative mx-auto mb-4 h-12 w-12">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
          <div className="border-t-primary absolute inset-0 animate-spin rounded-full border-4 border-transparent"></div>
        </div>
        <p className="text-muted-foreground">Loading PDF viewer...</p>
      </div>
    ),
  },
);

type PreviewDialogProps = {
  fileId: string;
  fileName: string;
  mimeType: string;
  permission?: "READ" | "READ_WRITE";
  onClose: () => void;
};

export function PreviewDialog({
  fileId,
  fileName,
  mimeType,
  permission = "READ_WRITE",
  onClose,
}: PreviewDialogProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let blobUrl: string | null = null;

    const loadFile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use view endpoint for preview (allows viewing even with READ permission)
        const response = await fetch(`/api/files/${fileId}/view`);
        if (!response.ok) {
          throw new Error("Failed to load file");
        }

        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);
        setFileUrl(blobUrl);
      } catch (err) {
        console.error("Error loading file:", err);
        setError(err instanceof Error ? err.message : "Failed to load file");
      } finally {
        setLoading(false);
      }
    };

    loadFile();

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [fileId]);

  const isImage = mimeType.startsWith("image/");
  const isPDF = mimeType === "application/pdf";
  const isVideo = mimeType.startsWith("video/");
  const isAudio = mimeType.startsWith("audio/");
  const isText =
    mimeType.startsWith("text/") || mimeType === "application/json";

  return (
    <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4">
      <Card className="flex max-h-[90vh] w-full max-w-6xl flex-col">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="truncate text-lg font-semibold">{fileName}</h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <div className="relative mx-auto mb-4 h-12 w-12">
                  <div className="absolute inset-0 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
                  <div className="border-t-primary absolute inset-0 animate-spin rounded-full border-4 border-transparent"></div>
                </div>
                <p className="text-muted-foreground">Loading file...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <p className="text-destructive mb-2">{error}</p>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && fileUrl && (
            <>
              {isImage && (
                <div className="flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fileUrl}
                    alt={fileName}
                    className="max-h-[70vh] max-w-full object-contain"
                    onError={(e) => {
                      console.error("Image load error:", e);
                      setError("Failed to display image");
                    }}
                  />
                </div>
              )}

              {isPDF && (
                <PDFViewer
                  fileUrl={fileUrl}
                  fileName={fileName}
                  permission={permission}
                  token="" // Not needed for preview
                  fileId={fileId} // Pass fileId for download
                />
              )}

              {isVideo && (
                <div className="flex items-center justify-center">
                  <video
                    src={fileUrl}
                    controls
                    className="max-h-[70vh] max-w-full"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}

              {isAudio && (
                <div className="flex items-center justify-center py-8">
                  <audio src={fileUrl} controls className="w-full max-w-md">
                    Your browser does not support the audio tag.
                  </audio>
                </div>
              )}

              {isText && (
                <iframe
                  src={fileUrl}
                  className="h-[70vh] w-full rounded border bg-white dark:bg-gray-800"
                  title={fileName}
                />
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
