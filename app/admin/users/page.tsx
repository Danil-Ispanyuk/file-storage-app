import { Metadata } from "next";
import { UserList } from "@/components/admin/UserList";

export const metadata: Metadata = {
  title: "User Management | Admin",
  description: "Manage users and their roles",
};

export default function AdminUsersPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">User Management</h1>
      <UserList />
    </div>
  );
}
