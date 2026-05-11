import { useEffect, useState } from "react";
import type { TradeRecord } from "./history-bar";

export function ActiveTradesOverlay({ trades }: { trades: TradeRecord[] }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, []);

  const active = trades.filter((t) => !t.result && t.expiresAt > now - 1000);
  if (active.length === 0) return null;

  return (
    <div className="absolute top-3 right-3 z-10 space-y-2">
      {active.map((t) => {
        const remainingMs = Math.max(0, t.expiresAt - now);
        const total = t.duration * 1000;
        const pct = Math.min(100, Math.max(0, ((total - remainingMs) / total) * 100));
        const seconds = Math.ceil(remainingMs / 1000);
        return (
          <div
            key={t.id}
            className="w-56 bg-card/90 backdrop-blur border border-border rounded-md p-2.5 shadow-xl"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">
                {t.assetSymbol} ·{" "}
                <span className={t.direction === "CALL" ? "text-call" : "text-put"}>
                  {t.direction}
                </span>
              </span>
              <span className="font-mono font-bold">{seconds}s</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className={t.direction === "CALL" ? "h-full bg-call" : "h-full bg-put"}
                style={{ width: `${pct}%`, transition: "width 200ms linear" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
