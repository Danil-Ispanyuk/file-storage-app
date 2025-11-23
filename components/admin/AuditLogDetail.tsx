"use client";

import { AuditLog } from "./AuditLogList";

interface AuditLogDetailProps {
  log: AuditLog | null;
  onClose: () => void;
}

export function AuditLogDetail({ log, onClose }: AuditLogDetailProps) {
  if (!log) return null;

  let metadata: Record<string, unknown> = {};
  try {
    if (log.metadata) {
      metadata = JSON.parse(log.metadata);
    }
  } catch {
    // Ignore parse errors
  }

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">Audit Log Details</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="font-medium">ID:</label>
            <p className="text-sm text-gray-600">{log.id}</p>
          </div>

          <div>
            <label className="font-medium">Action:</label>
            <p className="text-sm">{log.action}</p>
          </div>

          <div>
            <label className="font-medium">Success:</label>
            <p className="text-sm">{log.success ? "Yes" : "No"}</p>
          </div>

          <div>
            <label className="font-medium">User:</label>
            <p className="text-sm">
              {log.user
                ? `${log.user.email} (${log.user.name || "No name"})`
                : "System"}
            </p>
          </div>

          <div>
            <label className="font-medium">IP Address:</label>
            <p className="text-sm">{log.ipAddress || "N/A"}</p>
          </div>

          <div>
            <label className="font-medium">User Agent:</label>
            <p className="text-sm text-xs break-all">
              {log.userAgent || "N/A"}
            </p>
          </div>

          <div>
            <label className="font-medium">Date:</label>
            <p className="text-sm">
              {new Date(log.createdAt).toLocaleString()}
            </p>
          </div>

          {Object.keys(metadata).length > 0 && (
            <div>
              <label className="font-medium">Metadata:</label>
              <pre className="overflow-auto rounded bg-gray-100 p-2 text-xs">
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="rounded bg-gray-600 px-4 py-2 text-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
