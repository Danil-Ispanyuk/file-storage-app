"use client";

import { useState, useEffect } from "react";
import { Role } from "@prisma/client";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  emailVerified: Date | null;
  storageQuota: number;
  usedStorage: number;
  createdAt: Date;
  _count: {
    files: number;
    auditLogs: number;
  };
}

interface UserListProps {
  onRoleChange?: () => void;
}

export function UserList({ onRoleChange }: UserListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [stats, setStats] = useState<Record<string, number>>({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
      });

      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) throw new Error("Failed to fetch users");

      const data = await response.json();
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, roleFilter]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-800";
      case "MANAGER":
        return "bg-blue-100 text-blue-800";
      case "USER":
        return "bg-green-100 text-green-800";
      case "GUEST":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 rounded-lg border px-4 py-2"
        />
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border px-4 py-2"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Manager</option>
          <option value="USER">User</option>
          <option value="GUEST">Guest</option>
        </select>
      </div>

      {/* Stats */}
      {Object.keys(stats).length > 0 && (
        <div className="flex gap-4 text-sm">
          {Object.entries(stats).map(([role, count]) => (
            <span key={role} className="text-gray-600">
              {role}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="py-8 text-center">Loading...</div>
      ) : users.length === 0 ? (
        <div className="py-8 text-center text-gray-500">No users found</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Role</th>
                  <th className="p-2 text-left">Storage</th>
                  <th className="p-2 text-left">Files</th>
                  <th className="p-2 text-left">Created</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{user.email}</td>
                    <td className="p-2">{user.name || "-"}</td>
                    <td className="p-2">
                      <span
                        className={`rounded px-2 py-1 text-xs ${getRoleBadgeColor(
                          user.role,
                        )}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="p-2 text-sm">
                      {formatBytes(user.usedStorage)} /{" "}
                      {formatBytes(user.storageQuota)}
                    </td>
                    <td className="p-2">{user._count.files}</td>
                    <td className="p-2 text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-2">
                      <UserRoleEditor
                        user={user}
                        onRoleChanged={() => {
                          fetchUsers();
                          onRoleChange?.();
                        }}
                      />
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

function UserRoleEditor({
  user,
  onRoleChanged,
}: {
  user: User;
  onRoleChanged: () => void;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>(user.role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepUpRequired, setStepUpRequired] = useState(false);

  const handleRoleChange = async () => {
    if (selectedRole === user.role) {
      setShowDialog(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, check if step-up is required
      const stepUpResponse = await fetch("/api/auth/step-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "" }), // Will trigger step-up requirement
      });

      if (stepUpResponse.status === 403) {
        const data = await stepUpResponse.json();
        if (data.stepUpRequired) {
          setStepUpRequired(true);
          setLoading(false);
          return;
        }
      }

      // If step-up is not required or already done, proceed with role change
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update role");
      }

      setShowDialog(false);
      onRoleChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setLoading(false);
    }
  };

  if (stepUpRequired) {
    return (
      <div className="text-sm text-orange-600">
        Step-up auth required. Please complete 2FA first.
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="text-sm text-blue-600 hover:underline"
      >
        Change Role
      </button>

      {showDialog && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-lg font-bold">Change User Role</h3>
            <p className="mb-4 text-sm text-gray-600">User: {user.email}</p>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as Role)}
              className="mb-4 w-full rounded-lg border px-4 py-2"
            >
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="USER">User</option>
              <option value="GUEST">Guest</option>
            </select>

            {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDialog(false);
                  setError(null);
                }}
                className="rounded border px-4 py-2"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChange}
                disabled={loading}
                className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
