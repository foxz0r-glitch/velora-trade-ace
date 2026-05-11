import { brl } from "@/lib/format";
import { ArrowDown, ArrowUp } from "lucide-react";

export type TradeRecord = {
  id: string;
  assetSymbol: string;
  direction: "CALL" | "PUT";
  amount: number;
  duration: number;
  expiresAt: number;
  result?: "WIN" | "LOSS" | "DRAW";
  profit?: number;
  closePrice?: number;
};

export function HistoryBar({ trades }: { trades: TradeRecord[] }) {
  return (
    <footer className="h-24 shrink-0 bg-panel border-t border-border flex flex-col">
      <div className="px-4 py-1.5 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
        Histórico de operações
      </div>
      <div className="flex-1 overflow-x-auto">
        {trades.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            Nenhuma operação ainda
          </div>
        ) : (
          <div className="flex h-full gap-2 px-3 py-2">
            {trades.map((t) => {
              const pending = !t.result;
              const color =
                t.result === "WIN"
                  ? "text-call border-call/40 bg-call/10"
                  : t.result === "LOSS"
                  ? "text-put border-put/40 bg-put/10"
                  : t.result === "DRAW"
                  ? "text-muted-foreground border-border bg-muted/40"
                  : "text-foreground border-border bg-secondary";
              return (
                <div
                  key={t.id}
                  className={`shrink-0 w-44 border rounded-md px-2.5 py-1.5 text-xs ${color}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{t.assetSymbol}</span>
                    {t.direction === "CALL" ? (
                      <ArrowUp className="w-3.5 h-3.5 text-call" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-put" />
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between">
                    <span className="opacity-80">{brl(t.amount)}</span>
                    <span className="font-bold">
                      {pending ? "..." : t.result}
                    </span>
                  </div>
                  {!pending && (
                    <div className="text-[11px] opacity-80">
                      {t.profit !== undefined
                        ? `${t.profit >= 0 ? "+" : ""}${brl(t.profit)}`
                        : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </footer>
  );
}
