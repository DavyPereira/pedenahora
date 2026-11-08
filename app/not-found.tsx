import Link from "next/link";
import { Clock, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle 700px at 0% 280px, rgba(0, 0, 0, 0.035), transparent),
            radial-gradient(circle 700px at 100% 280px, rgba(0, 0, 0, 0.025), transparent)
          `,
        }}
      />

      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-2">
          <Clock className="w-5 h-5" strokeWidth={2.75} style={{ color: "var(--brand-sage)" }} />
          <span
            className="font-heading text-xl font-bold tracking-tight"
            style={{ color: "var(--brand-sage)" }}
          >
            PedeNaHora
          </span>
        </div>
      </header>

      <main className="relative flex-1 flex flex-col items-center justify-center text-center gap-5 px-6 py-24">
        <span className="text-7xl animate-pulse-soft select-none">🔍</span>
        <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight text-foreground">
          Página não encontrada
        </h1>
        <p className="text-muted-foreground max-w-sm">
          O endereço que você acessou não existe ou foi movido. Volte para a página inicial para
          continuar.
        </p>
        <Button asChild className="rounded-full mt-2 gap-2">
          <Link href="/">
            <Home className="w-4 h-4" />
            Voltar para o início
          </Link>
        </Button>
      </main>
    </div>
  );
}
