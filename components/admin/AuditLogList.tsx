"use client";

import { useState, useEffect } from "react";
import type { AuditAction } from "@prisma/client";

export interface AuditLog {
  id: string;
  action: AuditAction;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: string | null;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

interface AuditLogListProps {
  onLogSelected?: (log: AuditLog) => void;
}

export function AuditLogList({ onLogSelected }: AuditLogListProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    action: "",
    userId: "",
    startDate: "",
    endDate: "",
    success: "",
    search: "",
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        ...(filters.action && { action: filters.action }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.success && { success: filters.success }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      if (!response.ok) throw new Error("Failed to fetch audit logs");

      const data = await response.json();
      setLogs(data.logs);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  const getActionColor = (action: string) => {
    if (action.includes("SUCCESS") || action.includes("VERIFY_SUCCESS")) {
      return "text-green-600";
    }
    if (action.includes("FAILED") || action.includes("EXCEEDED")) {
      return "text-red-600";
    }
    return "text-blue-600";
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <AuditLogFilters filters={filters} onFiltersChange={setFilters} />

      {/* Table */}
      {loading ? (
        <div className="py-8 text-center">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="py-8 text-center text-gray-500">No logs found</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Action</th>
                  <th className="p-2 text-left">User</th>
                  <th className="p-2 text-left">Success</th>
                  <th className="p-2 text-left">IP Address</th>
                  <th className="p-2 text-left">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="cursor-pointer border-b hover:bg-gray-50"
                    onClick={() => onLogSelected?.(log)}
                  >
                    <td className="p-2">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className={`p-2 ${getActionColor(log.action)}`}>
                      {log.action}
                    </td>
                    <td className="p-2">
                      {log.user ? log.user.email : "System"}
                    </td>
                    <td className="p-2">
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          log.success
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {log.success ? "Success" : "Failed"}
                      </span>
                    </td>
                    <td className="p-2">{log.ipAddress || "-"}</td>
                    <td className="p-2">
                      <button className="text-blue-600 hover:underline">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded border px-4 py-2 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded border px-4 py-2 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface AuditLogFiltersProps {
  filters: {
    action: string;
    userId: string;
    startDate: string;
    endDate: string;
    success: string;
    search: string;
  };
  onFiltersChange: (filters: {
    action: string;
    userId: string;
    startDate: string;
    endDate: string;
    success: string;
    search: string;
  }) => void;
}

function AuditLogFilters({ filters, onFiltersChange }: AuditLogFiltersProps) {
  const actions: string[] = [
    "LOGIN_SUCCESS",
    "LOGIN_FAILED",
    "LOGOUT",
    "REGISTER",
    "TWO_FACTOR_SETUP",
    "TWO_FACTOR_VERIFY_SUCCESS",
    "TWO_FACTOR_VERIFY_FAILED",
    "FILE_UPLOADED",
    "FILE_DOWNLOADED",
    "FILE_DELETED",
    "RATE_LIMIT_EXCEEDED",
  ];

  return (
    <div className="space-y-4 rounded-lg border bg-white p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Action</label>
          <select
            value={filters.action}
            onChange={(e) =>
              onFiltersChange({ ...filters, action: e.target.value })
            }
            className="w-full rounded border px-3 py-2"
          >
            <option value="">All Actions</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Success</label>
          <select
            value={filters.success}
            onChange={(e) =>
              onFiltersChange({ ...filters, success: e.target.value })
            }
            className="w-full rounded border px-3 py-2"
          >
            <option value="">All</option>
            <option value="true">Success</option>
            <option value="false">Failed</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Search</label>
          <input
            type="text"
            placeholder="Search in metadata..."
            value={filters.search}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Start Date</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              onFiltersChange({ ...filters, startDate: e.target.value })
            }
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">End Date</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              onFiltersChange({ ...filters, endDate: e.target.value })
            }
            className="w-full rounded border px-3 py-2"
          />
        </div>
      </div>

      <button
        onClick={() =>
          onFiltersChange({
            action: "",
            userId: "",
            startDate: "",
            endDate: "",
            success: "",
            search: "",
          })
        }
        className="text-sm text-blue-600 hover:underline"
      >
        Clear Filters
      </button>
    </div>
  );
}
