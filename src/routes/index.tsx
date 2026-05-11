import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { getToken } from "@/lib/api";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-call/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-call" />
          </div>
          <span className="text-lg font-bold tracking-tight">Velora Broker</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition"
          >
            Entrar
          </Link>
          <Link
            to="/register"
            className="text-sm font-semibold bg-call text-call-foreground px-4 py-2 rounded-md hover:opacity-90 transition"
          >
            Criar conta
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
          Opere com <span className="text-call">confiança</span>
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl max-w-xl mb-8">
          Plataforma de opções binárias profissional. Acesse mais de 30 ativos, payouts de até 92% e resultados em segundos.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link
            to={getToken() ? "/trade" : "/register"}
            className="bg-call text-call-foreground font-bold px-8 py-3 rounded-lg text-base hover:opacity-90 transition"
          >
            Começar agora
          </Link>
          <Link
            to="/login"
            className="border border-border text-foreground font-semibold px-8 py-3 rounded-lg text-base hover:bg-accent transition"
          >
            Já tenho conta
          </Link>
        </div>
      </main>
    </div>
  );
}
