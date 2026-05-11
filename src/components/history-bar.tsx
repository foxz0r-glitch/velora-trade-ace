import { brl } from "@/lib/format";
import { TrendingDown, TrendingUp, History } from "lucide-react";

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
    <footer className="h-28 shrink-0 bg-panel/95 backdrop-blur border-t border-border flex flex-col">
      <div className="px-4 py-2 border-b border-border flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
        <History className="w-3.5 h-3.5" />
        Histórico de operações
        <span className="ml-auto text-muted-foreground/70 normal-case tracking-normal">
          {trades.length} {trades.length === 1 ? "operação" : "operações"}
        </span>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        {trades.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            Nenhuma operação ainda — abra sua primeira trade
          </div>
        ) : (
          <div className="flex h-full gap-2 px-3 py-2">
            {trades.map((t) => {
              const pending = !t.result;
              const isCall = t.direction === "CALL";
              const accent =
                t.result === "WIN"
                  ? "border-call/50 bg-gradient-to-br from-call/15 to-call/5"
                  : t.result === "LOSS"
                  ? "border-put/50 bg-gradient-to-br from-put/15 to-put/5"
                  : t.result === "DRAW"
                  ? "border-border bg-muted/30"
                  : "border-border/80 bg-secondary/40";
              const resultText =
                t.result === "WIN"
                  ? "text-call"
                  : t.result === "LOSS"
                  ? "text-put"
                  : "text-muted-foreground";
              return (
                <div
                  key={t.id}
                  className={`shrink-0 w-48 border rounded-lg px-3 py-1.5 flex flex-col justify-between ${accent}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                          isCall ? "bg-call/20" : "bg-put/20"
                        }`}
                      >
                        {isCall ? (
                          <TrendingUp className="w-3 h-3 text-call" strokeWidth={3} />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-put" strokeWidth={3} />
                        )}
                      </div>
                      <span className="text-xs font-bold truncate">{t.assetSymbol}</span>
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider ${resultText}`}
                    >
                      {pending ? (
                        <span className="text-muted-foreground animate-pulse">aberto</span>
                      ) : (
                        t.result
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground tabular-nums">{brl(t.amount)}</span>
                    {!pending && t.profit !== undefined && (
                      <span className={`font-bold tabular-nums ${resultText}`}>
                        {t.profit >= 0 ? "+" : ""}
                        {brl(t.profit)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </footer>
  );
}
