import { auth, signOut } from "@/lib/auth";
import { isUser2FAEnabled } from "@/lib/totpService";
import { redirect } from "next/navigation";
import { FileUpload } from "@/components/FileUpload";
import { FileListWithTabsClient } from "@/components/FileListWithTabsClient";
import { StorageQuota } from "@/components/StorageQuota";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  // Check if 2FA is enabled (mandatory after registration)
  try {
    const has2FAEnabled = await isUser2FAEnabled(session.user.id);
    if (!has2FAEnabled) {
      redirect("/settings/2fa?setup=true&mandatory=true");
    }
  } catch (error) {
    // If error checking 2FA, redirect to setup (safer default)
    console.error("Error checking 2FA status:", error);
    redirect("/settings/2fa?setup=true&mandatory=true");
  }

  return (
    <main className="bg-background text-foreground mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Files</h1>
        <form
          action={async () => {
            "use server";
            // signOut redirects to /api/auth/signout which will log the event
            await signOut();
          }}
        >
          <button
            type="submit"
            className="border-border hover:bg-accent rounded-md border px-3 py-2 text-sm font-medium"
          >
            Sign out
          </button>
        </form>
      </header>

      <section className="space-y-6">
        <StorageQuota />
        <FileUpload />
        <FileListWithTabsClient />
      </section>
    </main>
  );
}
