"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type FileUploadProps = {
  onUploadSuccess?: () => void;
};

export function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [compress, setCompress] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (compress) {
        formData.append("compress", "true");
      }

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setProgress(percentComplete);
        }
      });

      const uploadPromise = new Promise<{
        message: string;
        file: { id: string; name: string };
      }>((resolve, reject) => {
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const responseData = JSON.parse(xhr.responseText);
              resolve(responseData);
            } catch {
              resolve(null);
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              // Handle storage quota exceeded (413)
              if (xhr.status === 413 || error.quotaExceeded) {
                reject(
                  new Error(
                    error.message ||
                      `Storage quota exceeded. Available: ${formatBytes(error.available || 0)}, Required: ${formatBytes(error.required || 0)}`,
                  ),
                );
              } else {
                reject(new Error(error.message || "Upload failed"));
              }
            } catch {
              reject(new Error("Upload failed"));
            }
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error"));
        });

        xhr.open("POST", "/api/files/upload");
        xhr.send(formData);
      });

      const responseData = await uploadPromise;
      setProgress(100);
      onUploadSuccess?.();

      // Show compression info if available
      if (compress && responseData?.compression) {
        const saved = formatBytes(responseData.compression.saved);
        const ratio = ((1 - responseData.compression.ratio) * 100).toFixed(1);
        console.log(`Compressed: Saved ${saved} (${ratio}% reduction)`);
      }

      // Reset after a short delay and refresh page
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
        setCompress(false);
        setSelectedFile(null);
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Auto-enable compression for supported formats
      const isImage = file.type.startsWith("image/");
      if (isImage) {
        setCompress(true);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      // Auto-enable compression for supported formats
      const isImage = file.type.startsWith("image/");
      if (isImage) {
        setCompress(true);
      }
      handleUpload(file);
    }
  };

  return (
    <Card className="p-6">
      <div
        className={`border-border flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          dragActive
            ? "bg-accent border-primary"
            : "bg-background hover:bg-accent/50"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />

        {uploading ? (
          <div className="w-full space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="relative h-12 w-12">
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
                <div className="border-t-primary absolute inset-0 animate-spin rounded-full border-4 border-transparent"></div>
              </div>
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Uploading file...</span>
                  <span className="text-primary">{Math.round(progress)}%</span>
                </div>
                <div className="bg-secondary h-3 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mb-4 text-center">
              Drag and drop a file here, or click to select
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Select File
            </Button>
            {selectedFile && (
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Selected: {selectedFile.name} (
                  {formatBytes(selectedFile.size)})
                </p>
                {(selectedFile.type.startsWith("image/") ||
                  selectedFile.type.includes("zip") ||
                  selectedFile.type.includes("tar")) && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={compress}
                      onChange={(e) => setCompress(e.target.checked)}
                      disabled={uploading}
                    />
                    <span className="text-muted-foreground">
                      Compress file before upload (saves storage space)
                    </span>
                  </label>
                )}
                <Button
                  onClick={() => handleUpload(selectedFile)}
                  disabled={uploading}
                  className="w-full"
                >
                  Upload
                </Button>
              </div>
            )}
          </>
        )}

        {error && <p className="text-destructive mt-4 text-sm">{error}</p>}
      </div>
    </Card>
  );
}
