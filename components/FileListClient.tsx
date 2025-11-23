"use client";

import { useState } from "react";
import { FileList } from "./FileList";
import { StepUpDialog } from "./StepUpDialog";

export function FileListClient() {
  const [stepUpToken, setStepUpToken] = useState<string | null>(null);
  const [showStepUp, setShowStepUp] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null,
  );

  const handleDownload = async (id: string) => {
    setDownloadingFileId(id);
    try {
      const response = await fetch(`/api/files/${id}/download`);
      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      // Get filename from Content-Disposition header or use id
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

      // Download file
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
    } finally {
      setDownloadingFileId(null);
    }
  };

  const performDelete = async (id: string, token?: string) => {
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers["X-Step-Up-Token"] = token;
      }

      const response = await fetch(`/api/files/${id}`, {
        method: "DELETE",
        headers,
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Check if step-up authentication is required
        if (responseData.stepUpRequired) {
          setPendingDeleteId(id);
          setShowStepUp(true);
          return;
        }
        throw new Error(responseData.message || "Failed to delete file");
      }

      // Refresh the file list by reloading the page
      window.location.reload();
    } catch (error) {
      console.error("Delete error:", error);
      alert(error instanceof Error ? error.message : "Failed to delete file");
    }
  };

  const handleDelete = async (id: string) => {
    await performDelete(id, stepUpToken || undefined);
  };

  const handleStepUpSuccess = (token: string) => {
    setStepUpToken(token);
    setShowStepUp(false);
    // Automatically retry delete with step-up token
    if (pendingDeleteId) {
      performDelete(pendingDeleteId, token);
      setPendingDeleteId(null);
    }
  };

  const handleStepUpCancel = () => {
    setShowStepUp(false);
    setPendingDeleteId(null);
  };

  return (
    <>
      {showStepUp && (
        <StepUpDialog
          onSuccess={handleStepUpSuccess}
          onCancel={handleStepUpCancel}
          title="Additional Authentication Required"
          message="Please enter your 2FA code to delete this file."
        />
      )}
      <FileList
        onDownload={handleDownload}
        onDelete={handleDelete}
        downloadingFileId={downloadingFileId}
      />
    </>
  );
}
