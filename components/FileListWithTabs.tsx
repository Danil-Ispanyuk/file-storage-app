"use client";

import { useState, useEffect, useCallback } from "react";
import { FileItem } from "./FileItem";
import { SharedFileItem } from "./SharedFileItem";
import { Button } from "@/components/ui/button";

type File = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string | Date;
};

type SharedFile = {
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

type SharedFileGroup = {
  sharedBy: {
    id: string;
    email: string;
    name: string | null;
  };
  files: SharedFile[];
};

type FileListWithTabsProps = {
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
  onRemoveSharedFile?: (shareId: string) => void;
  downloadingFileId?: string | null;
};

type Tab = "my-files" | { type: "shared-by"; email: string };

export function FileListWithTabs({
  onDownload,
  onDelete,
  onRemoveSharedFile,
  downloadingFileId,
}: FileListWithTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("my-files");
  const [myFiles, setMyFiles] = useState<File[]>([]);
  const [sharedGroups, setSharedGroups] = useState<SharedFileGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchMyFiles = useCallback(async () => {
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
      setMyFiles(data.files || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  }, [page, search]);

  const fetchSharedFiles = useCallback(async () => {
    try {
      const response = await fetch("/api/files/shared");
      if (!response.ok) {
        throw new Error("Failed to fetch shared files");
      }

      const data = await response.json();
      setSharedGroups(data.grouped || []);
    } catch (error) {
      console.error("Error fetching shared files:", error);
    }
  }, []);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "my-files") {
        await fetchMyFiles();
      } else {
        await fetchSharedFiles();
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, fetchMyFiles, fetchSharedFiles]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Fetch shared files on mount to populate tabs
  useEffect(() => {
    fetchSharedFiles();
  }, [fetchSharedFiles]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleRefresh = () => {
    fetchFiles();
    if (activeTab !== "my-files") {
      fetchSharedFiles();
    }
  };

  const getCurrentFiles = (): (File | SharedFile)[] => {
    if (activeTab === "my-files") {
      return myFiles;
    } else {
      const group = sharedGroups.find(
        (g) => g.sharedBy.email === activeTab.email,
      );
      return group?.files || [];
    }
  };

  const currentFiles = getCurrentFiles();
  const isSharedTab = activeTab !== "my-files";

  if (loading && currentFiles.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        Loading files...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("my-files")}
            className={`border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === "my-files"
                ? "border-primary text-primary"
                : "text-muted-foreground border-transparent hover:border-gray-300"
            }`}
          >
            My Files ({myFiles.length})
          </button>
          {sharedGroups.map((group) => (
            <button
              key={group.sharedBy.email}
              onClick={() =>
                setActiveTab({ type: "shared-by", email: group.sharedBy.email })
              }
              className={`border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab !== "my-files" &&
                activeTab.email === group.sharedBy.email
                  ? "border-primary text-primary"
                  : "text-muted-foreground border-transparent hover:border-gray-300"
              }`}
            >
              Shared by {group.sharedBy.email} ({group.files.length})
            </button>
          ))}
        </div>
      </div>

      {/* Search and Refresh */}
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

      {/* File List */}
      {currentFiles.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            {isSharedTab
              ? "No files shared with you yet."
              : "No files yet. Upload your first file to get started."}
          </p>
          <Button onClick={handleRefresh}>Refresh</Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {currentFiles.map((file) => {
              if (isSharedTab && "shareId" in file) {
                return (
                  <SharedFileItem
                    key={file.shareId}
                    file={file as SharedFile}
                    onDownload={onDownload}
                    onRemove={onRemoveSharedFile}
                    isDownloading={downloadingFileId === file.id}
                  />
                );
              } else {
                return (
                  <FileItem
                    key={file.id}
                    file={file as File}
                    onDownload={onDownload}
                    onDelete={onDelete}
                    isDownloading={downloadingFileId === file.id}
                  />
                );
              }
            })}
          </div>

          {/* Pagination (only for my files) */}
          {!isSharedTab && totalPages > 1 && (
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
        </>
      )}
    </div>
  );
}
