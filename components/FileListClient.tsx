"use client";

import { FileList } from "./FileList";

export function FileListClient() {
  const handleDownload = async (id: string) => {
    try {
      const response = await fetch(`/api/files/${id}/download`);
      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      // Get filename from Content-Disposition header or use id
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = id;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1]);
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
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/files/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete file");
      }

      // Refresh the file list by reloading the page
      window.location.reload();
    } catch (error) {
      console.error("Delete error:", error);
      alert(error instanceof Error ? error.message : "Failed to delete file");
    }
  };

  return <FileList onDownload={handleDownload} onDelete={handleDelete} />;
}
