import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SharedFilesList } from "@/components/SharedFilesList";

export default async function SharedFilesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  return (
    <main className="bg-background text-foreground mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
      <header>
        <h1 className="text-2xl font-semibold">Shared Files</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Files that have been shared with you
        </p>
      </header>

      <section>
        <SharedFilesList />
      </section>
    </main>
  );
}
