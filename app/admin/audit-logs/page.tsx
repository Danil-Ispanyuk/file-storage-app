"use client";

import { useState } from "react";
import { AuditLogList } from "@/components/admin/AuditLogList";
import { AuditLogDetail } from "@/components/admin/AuditLogDetail";
import type { AuditLog } from "@/components/admin/AuditLogList";

export default function AdminAuditLogsPage() {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Audit Logs</h1>
      <AuditLogList onLogSelected={(log) => setSelectedLog(log)} />
      <AuditLogDetail log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
