import { useEffect, useState } from "react";
import { Clock, DollarSign, Minus, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { api } from "@/lib/api";
import { brl } from "@/lib/format";
import type { Asset } from "./asset-sidebar";

const DURATIONS = [
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "2m", value: 120 },
  { label: "5m", value: 300 },
];

const QUICK_AMOUNTS = [5, 10, 25, 50, 100, 250];

export function TradePanel({
  asset,
  isDemo,
  onTradePlaced,
}: {
  asset: Asset | null;
  isDemo: boolean;
  onTradePlaced: (trade: { id: string; assetSymbol: string; direction: "CALL" | "PUT"; amount: number; duration: number; expiresAt: number }) => void;
}) {
  const [amount, setAmount] = useState<number>(10);
  const [duration, setDuration] = useState<number>(60);
  const [submitting, setSubmitting] = useState<null | "CALL" | "PUT">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const place = async (direction: "CALL" | "PUT") => {
    if (!asset) return;
    if (amount < 1) {
      setError("Valor mínimo R$1");
      return;
    }
    setSubmitting(direction);
    setError(null);
    try {
      const res = await api.trade({
        assetId: asset.id,
        direction,
        amount,
        duration,
        isDemo,
      });
      onTradePlaced({
        id: res.id,
        assetSymbol: asset.symbol,
        direction,
        amount,
        duration,
        expiresAt: res.expiresAt
          ? new Date(res.expiresAt).getTime()
          : Date.now() + duration * 1000,
      });
    } catch (e: any) {
      setError(e.message || "Erro ao abrir operação");
    } finally {
      setSubmitting(null);
    }
  };

  const payout = asset?.payout ?? 0;
  const profit = amount * (payout / 100);

  return (
    <aside className="w-64 shrink-0 bg-panel border-l border-border/60 flex flex-col">
      {isDemo && (
        <div className="bg-secondary border-b border-border px-4 py-2 flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-call animate-pulse" />
          <span className="text-[11px] font-bold text-foreground uppercase tracking-[0.18em]">
            Modo Demo · Saldo Virtual
          </span>
        </div>
      )}

      {/* Asset header */}
      <div className="p-4 border-b border-border bg-card/40">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              Ativo
            </div>
            <div className="mt-0.5 text-sm font-bold truncate">
              {asset ? asset.symbol : "—"}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {asset?.name ?? "Selecione um ativo"}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Payout</div>
            <div className="text-2xl font-black text-call leading-none">+{payout}<span className="text-base">%</span></div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5 flex-1 overflow-y-auto">
        {/* Time */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Tempo de expiração
            </label>
          </div>
          <div className="relative rounded-lg bg-input border border-border px-4 py-3 flex items-center justify-center">
            <span className="font-mono text-2xl font-bold tabular-nums tracking-wider">
              {duration < 60
                ? `00:00:${String(duration).padStart(2, "0")}`
                : `00:${String(Math.floor(duration / 60)).padStart(2, "0")}:${String(duration % 60).padStart(2, "0")}`}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setDuration(d.value)}
                className={`text-xs py-2 rounded-md font-bold border transition ${
                  duration === d.value
                    ? "bg-accent border-call/60 text-foreground shadow-inner"
                    : "bg-secondary/60 border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-1.5 mb-2">
            <DollarSign className="w-3 h-3" /> Valor do investimento
          </label>
          <div className="flex items-stretch rounded-lg bg-input border border-border overflow-hidden">
            <button
              onClick={() => setAmount((a) => Math.max(1, +(a - 1).toFixed(2)))}
              className="px-4 hover:bg-accent transition flex items-center text-muted-foreground"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="flex-1 w-full bg-transparent border-x border-border px-2 py-2.5 text-center text-xl font-bold tabular-nums focus:outline-none"
            />
            <button
              onClick={() => setAmount((a) => +(a + 1).toFixed(2))}
              className="px-4 hover:bg-accent transition flex items-center text-muted-foreground"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {QUICK_AMOUNTS.map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`text-xs py-1.5 rounded-md font-semibold border transition ${
                  amount === v
                    ? "bg-accent border-call/50 text-foreground"
                    : "bg-secondary/60 border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                R${v}
              </button>
            ))}
          </div>
        </div>

        {/* Profit summary */}
        <div className="rounded-lg bg-gradient-to-br from-call/10 via-call/5 to-transparent border border-call/20 p-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Investimento</span>
            <span className="font-semibold tabular-nums">{brl(amount)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Lucro estimado</span>
            <span className="font-bold text-call tabular-nums">+{brl(profit)}</span>
          </div>
          <div className="h-px bg-border my-1" />
          <div className="flex justify-between text-sm">
            <span className="font-semibold">Total se ganhar</span>
            <span className="font-black text-call tabular-nums">{brl(amount + profit)}</span>
          </div>
        </div>

        {error && (
          <div className="text-xs text-put bg-put/10 border border-put/30 rounded-md px-3 py-2 font-medium">
            {error}
          </div>
        )}
      </div>

      {/* CTA buttons */}
      <div className="p-4 pt-0 space-y-2.5">
        <button
          disabled={!asset || submitting !== null}
          onClick={() => place("CALL")}
          style={{ backgroundColor: "#32AC41" }}
          className="group relative w-full text-white font-black text-base py-3.5 rounded-lg overflow-hidden shadow-[0_4px_14px_rgba(50,172,65,0.25)] hover:shadow-[0_0_28px_rgba(50,172,65,0.65)] hover:brightness-110 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_70%)]" />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-black/25 group-hover:bg-black/40 transition-colors duration-300">
            <ArrowUp
              className="w-3.5 h-3.5 text-white/80 group-hover:text-white rotate-45 group-hover:rotate-0 transition-transform duration-500 ease-out will-change-transform [transform-origin:center] [backface-visibility:hidden]"
              strokeWidth={3}
            />
          </span>
          <span className="relative block pl-12 pr-4 text-left">{submitting === "CALL" ? "ABRINDO..." : "COMPRAR"}</span>
        </button>
        <button
          disabled={!asset || submitting !== null}
          onClick={() => place("PUT")}
          style={{ backgroundColor: "#F3382C" }}
          className="group relative w-full text-white font-black text-base py-3.5 rounded-lg overflow-hidden shadow-[0_4px_14px_rgba(243,56,44,0.25)] hover:shadow-[0_0_28px_rgba(243,56,44,0.65)] hover:brightness-110 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_70%)]" />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-black/25 group-hover:bg-black/40 transition-colors duration-300">
            <ArrowDown
              className="w-3.5 h-3.5 text-white/75 group-hover:text-white -rotate-45 group-hover:rotate-0 transition-all duration-500 ease-out"
              strokeWidth={3}
            />
          </span>
          <span className="relative block text-center">{submitting === "PUT" ? "ABRINDO..." : "VENDER"}</span>
        </button>
      </div>
    </aside>
  );
}
