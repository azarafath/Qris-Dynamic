import QrisGenerate from "@/components/qris-generate"

export default function Page() {
  return (
    <main className="min-h-dvh">
      {/* Glass hero replacing old header */}
      <section className="mx-auto max-w-5xl space-y-8 px-4 py-10 md:py-14">
        {/* Use new generator that depends on static payload, hides dynamic payload view */}
        <QrisGenerate />

        {/* Footer per request */}
        <footer className="pt-2 text-center text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            Made with
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current text-red-500">
              <path d="M12 21s-6.716-4.407-9.485-7.176C.534 11.843.5 8.9 2.343 7.057A4.5 4.5 0 0 1 8.7 7.2L12 10.5l3.3-3.3a4.5 4.5 0 1 1 6.364 6.364C18.716 16.593 12 21 12 21z" />
            </svg>
            Azarafath, 2025
          </span>
        </footer>
      </section>
    </main>
  )
}
