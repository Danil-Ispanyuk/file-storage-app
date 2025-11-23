"use client";

import { useState, useEffect, useCallback } from "react";
import { FileItem } from "./FileItem";
import { Button } from "@/components/ui/button";

type File = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string | Date;
};

type FileListProps = {
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
  downloadingFileId?: string | null;
};

export function FileList({
  onDownload,
  onDelete,
  downloadingFileId,
}: FileListProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (search) {
        params.append("search", search);
      }

      const response = await fetch(`/api/files?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }

      const data = await response.json();
      setFiles(data.files || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleRefresh = () => {
    fetchFiles();
  };

  if (loading && files.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        Loading files...
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground mb-4">
          No files yet. Upload your first file to get started.
        </p>
        <Button onClick={handleRefresh}>Refresh</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <input
            type="text"
            placeholder="Search files..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="border-border bg-background text-foreground flex h-10 w-full rounded-md border px-3 py-2 text-sm"
          />
          <Button type="submit">Search</Button>
          {search && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
            >
              Clear
            </Button>
          )}
        </form>
        <Button variant="outline" onClick={handleRefresh}>
          Refresh
        </Button>
      </div>

      <div className="space-y-2">
        {files.map((file) => (
          <FileItem
            key={file.id}
            file={file}
            onDownload={onDownload}
            onDelete={onDelete}
            isDownloading={downloadingFileId === file.id}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
