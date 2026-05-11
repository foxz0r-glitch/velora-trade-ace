import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, Clock, DollarSign } from "lucide-react";
import { api } from "@/lib/api";
import { brl } from "@/lib/format";
import type { Asset } from "./asset-sidebar";

const DURATIONS = [
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "2m", value: 120 },
  { label: "5m", value: 300 },
];

export function TradePanel({
  asset,
  onTradePlaced,
}: {
  asset: Asset | null;
  onTradePlaced: (trade: { id: string; assetSymbol: string; direction: "CALL" | "PUT"; amount: number; duration: number; expiresAt: number }) => void;
}) {
  const [amount, setAmount] = useState<number>(5);
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
    <aside className="w-72 shrink-0 bg-panel border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Operação
        </div>
        <div className="mt-1 text-sm font-semibold">
          {asset ? `${asset.symbol} · ${asset.name}` : "Selecione um ativo"}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Payout</span>
          <span className="text-call font-semibold">{payout}%</span>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        <div>
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> Valor (R$)
          </label>
          <div className="mt-1 flex items-stretch">
            <button
              onClick={() => setAmount((a) => Math.max(1, +(a - 1).toFixed(2)))}
              className="px-3 bg-secondary border border-border rounded-l-md hover:bg-accent text-sm"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="flex-1 w-full bg-input border-y border-border px-2 py-1.5 text-center text-sm font-semibold focus:outline-none"
            />
            <button
              onClick={() => setAmount((a) => +(a + 1).toFixed(2))}
              className="px-3 bg-secondary border border-border rounded-r-md hover:bg-accent text-sm"
            >
              +
            </button>
          </div>
          <div className="mt-1 grid grid-cols-4 gap-1">
            {[5, 10, 25, 50].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className="text-xs py-1 rounded bg-secondary border border-border hover:bg-accent"
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Tempo
          </label>
          <div className="mt-1 grid grid-cols-4 gap-1">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setDuration(d.value)}
                className={`text-xs py-2 rounded font-semibold border transition ${
                  duration === d.value
                    ? "bg-accent border-call text-foreground"
                    : "bg-secondary border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-secondary/50 rounded-md p-3 border border-border space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Investimento</span>
            <span className="font-semibold">{brl(amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Lucro estimado</span>
            <span className="font-semibold text-call">+{brl(profit)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total se ganhar</span>
            <span className="font-semibold">{brl(amount + profit)}</span>
          </div>
        </div>

        {error && (
          <div className="text-xs text-put bg-put/10 border border-put/30 rounded-md px-2.5 py-2">
            {error}
          </div>
        )}
      </div>

      <div className="p-4 pt-0 space-y-2">
        <button
          disabled={!asset || submitting !== null}
          onClick={() => place("CALL")}
          className="w-full flex items-center justify-center gap-2 bg-call text-call-foreground font-bold py-3 rounded-md hover:opacity-90 transition disabled:opacity-50"
        >
          <ArrowUp className="w-5 h-5" />
          {submitting === "CALL" ? "Abrindo..." : "CALL"}
        </button>
        <button
          disabled={!asset || submitting !== null}
          onClick={() => place("PUT")}
          className="w-full flex items-center justify-center gap-2 bg-put text-put-foreground font-bold py-3 rounded-md hover:opacity-90 transition disabled:opacity-50"
        >
          <ArrowDown className="w-5 h-5" />
          {submitting === "PUT" ? "Abrindo..." : "PUT"}
        </button>
      </div>
    </aside>
  );
}
