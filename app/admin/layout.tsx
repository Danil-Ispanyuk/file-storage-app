import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/authGuard";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { response } = await requireAdmin();

  if (response) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <div className="flex gap-4">
              <Link
                href="/admin/users"
                className="text-blue-600 hover:underline"
              >
                Users
              </Link>
              <Link
                href="/admin/audit-logs"
                className="text-blue-600 hover:underline"
              >
                Audit Logs
              </Link>
              <Link href="/" className="text-gray-600 hover:underline">
                Back to App
              </Link>
            </div>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
