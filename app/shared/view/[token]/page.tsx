"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import react-pdf only on client side to avoid SSR issues
const PDFViewer = dynamic(
  () => import("./PDFViewer").then((mod) => mod.PDFViewer),
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

export default function SharedFileViewPage() {
  const params = useParams();
  const token = params.token as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [permission, setPermission] = useState<"READ" | "READ_WRITE" | null>(
    null,
  );

  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const loadFile = async () => {
      try {
        setLoading(true);
        setError(null);

        // First, get share info to check permission
        const infoResponse = await fetch(`/api/files/shared/${token}/info`);
        if (infoResponse.ok) {
          const infoData = await infoResponse.json();
          setPermission(infoData.permission);
          setFileName(infoData.file.name);
          setMimeType(infoData.file.mimeType);
        }

        // Then load the file for viewing
        const response = await fetch(`/api/files/shared/${token}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to load file");
        }

        // Get file metadata from headers (always use as source of truth)
        const contentType = response.headers.get("Content-Type");
        const contentDisposition = response.headers.get("Content-Disposition");

        if (contentType) {
          setMimeType(contentType);
        }

        // Extract filename
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
          if (filenameMatch) {
            try {
              setFileName(decodeURIComponent(filenameMatch[1]));
            } catch {
              setFileName(filenameMatch[1]);
            }
          }
        }

        // Create blob URL for viewing
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        blobUrlRef.current = blobUrl;
        setFileUrl(blobUrl);
      } catch (err) {
        console.error("Error loading file:", err);
        setError(err instanceof Error ? err.message : "Failed to load file");
      } finally {
        setLoading(false);
      }
    };

    loadFile();

    // Cleanup blob URL on unmount or token change
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-12 w-12">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
            <div className="border-t-primary absolute inset-0 animate-spin rounded-full border-4 border-transparent"></div>
          </div>
          <p className="text-muted-foreground">Loading file...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4 text-lg font-semibold">Error</p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!fileUrl || !mimeType) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No file data available</p>
          <p className="text-muted-foreground text-xs">
            fileUrl: {fileUrl ? "✓" : "✗"}, mimeType: {mimeType || "none"}
          </p>
        </div>
      </div>
    );
  }

  // Determine how to display the file based on MIME type
  const isImage = mimeType.startsWith("image/");
  const isVideo = mimeType.startsWith("video/");
  const isAudio = mimeType.startsWith("audio/");
  const isPDF = mimeType === "application/pdf";
  const isText = mimeType.startsWith("text/");

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 dark:bg-gray-900">
      <div className="border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="truncate text-sm font-medium">
            {fileName || "Shared File"}
          </h1>
          {permission === "READ_WRITE" && (
            <div className="flex gap-2">
              <a
                href={`/api/files/shared/${token}?download=true`}
                className="text-primary hover:text-primary/80 text-sm font-medium"
                download={fileName || undefined}
              >
                Download
              </a>
            </div>
          )}
          {permission === "READ" && (
            <div className="text-muted-foreground text-xs">
              Read Only - Download not available
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        <div className="w-full max-w-full">
          {isImage && fileUrl && (
            <div className="relative flex h-full w-full items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl}
                alt={fileName || "Shared image"}
                className="max-h-full max-w-full object-contain"
                style={{
                  maxHeight: "calc(100vh - 80px)",
                  maxWidth: "100%",
                  display: "block",
                }}
                onError={(e) => {
                  console.error("Image load error:", e);
                  console.error("Blob URL:", fileUrl);
                  console.error("MIME type:", mimeType);
                  setError(
                    "Failed to display image. The file may be corrupted or in an unsupported format.",
                  );
                }}
                onLoad={() => {
                  console.log("Image loaded successfully");
                }}
              />
            </div>
          )}

          {isVideo && (
            <video
              src={fileUrl}
              controls
              className="max-h-full max-w-full"
              style={{ maxHeight: "calc(100vh - 80px)" }}
            >
              Your browser does not support the video tag.
            </video>
          )}

          {isAudio && (
            <div className="text-center">
              <audio src={fileUrl} controls className="w-full max-w-md">
                Your browser does not support the audio tag.
              </audio>
            </div>
          )}

          {isPDF && fileUrl && (
            <PDFViewer
              fileUrl={fileUrl}
              fileName={fileName}
              permission={permission}
              token={token}
            />
          )}

          {isText && (
            <iframe
              src={fileUrl}
              className="h-full w-full rounded border bg-white dark:bg-gray-800"
              style={{ minHeight: "calc(100vh - 80px)", width: "100%" }}
              title={fileName || "Text Viewer"}
            />
          )}

          {!isImage && !isVideo && !isAudio && !isPDF && !isText && (
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                This file type cannot be previewed in the browser.
              </p>
              {permission === "READ_WRITE" && (
                <a
                  href={`/api/files/shared/${token}?download=true`}
                  className="text-primary hover:text-primary/80 inline-block rounded-md border px-4 py-2 text-sm font-medium"
                  download={fileName || undefined}
                >
                  Download File
                </a>
              )}
              {permission === "READ" && (
                <p className="text-muted-foreground text-sm">
                  Download is not available. This file is shared with READ
                  permission only.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
