"use client";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

interface StorageStats {
  total: number;
  used: number;
  free: number;
  percentage: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

async function fetchStorageStats(): Promise<StorageStats> {
  const response = await fetch("/api/user/storage");
  if (!response.ok) {
    throw new Error("Failed to fetch storage statistics");
  }
  return response.json();
}

export function StorageQuota() {
  const { data, isLoading, error } = useQuery<StorageStats>({
    queryKey: ["storageStats"],
    queryFn: fetchStorageStats,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="text-muted-foreground text-sm">Loading storage...</div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-4">
        <div className="text-destructive text-sm">
          Failed to load storage information
        </div>
      </Card>
    );
  }

  const { total, used, free, percentage } = data;

  // Determine color based on usage
  let progressColor = "bg-primary";
  if (percentage >= 95) {
    progressColor = "bg-destructive";
  } else if (percentage >= 80) {
    progressColor = "bg-yellow-500";
  }

  return (
    <Card className="p-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-medium">
            Storage Usage
          </span>
          <span className="text-muted-foreground">
            {formatBytes(used)} / {formatBytes(total)}
          </span>
        </div>

        <div className="bg-secondary h-3 w-full overflow-hidden rounded-full">
          <div
            className={`${progressColor} h-full transition-all duration-300`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {formatBytes(free)} available
          </span>
          <span
            className={
              percentage >= 95
                ? "text-destructive font-semibold"
                : percentage >= 80
                  ? "font-semibold text-yellow-600"
                  : "text-muted-foreground"
            }
          >
            {percentage.toFixed(1)}% used
          </span>
        </div>

        {percentage >= 95 && (
          <div className="text-destructive text-xs font-medium">
            ⚠️ Storage almost full! Please delete some files.
          </div>
        )}
        {percentage >= 80 && percentage < 95 && (
          <div className="text-xs font-medium text-yellow-600">
            ⚠️ Storage getting full. Consider freeing up space.
          </div>
        )}
      </div>
    </Card>
  );
}
