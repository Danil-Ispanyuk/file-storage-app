function HomePage() {
  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-12">
      <div className="flex max-w-2xl flex-col items-center gap-4 text-center">
        <span className="border-primary text-primary rounded-full border border-dashed px-3 py-1 text-sm font-medium tracking-wider uppercase">
          file-storage-app
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Secure file storage MVP
        </h1>
        <p className="text-muted-foreground text-base text-balance sm:text-lg">
          Далі реалізуємо аутентифікацію, двофакторний захист і обмін файлами на
          основі Next.js 15, Shadcn UI та React Query.
        </p>
      </div>
    </main>
  );
}

export default HomePage;
