import { useEffect } from "react";
import { brl } from "@/lib/format";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";

export type ResultPopup = {
  result: "WIN" | "LOSS" | "DRAW";
  profit: number;
  symbol: string;
};

export function ResultModal({
  popup,
  onClose,
}: {
  popup: ResultPopup | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!popup) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [popup, onClose]);

  if (!popup) return null;

  const isWin = popup.result === "WIN";
  const isLoss = popup.result === "LOSS";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`max-w-sm w-[90%] rounded-xl border p-6 text-center shadow-2xl ${
          isWin
            ? "bg-call/10 border-call"
            : isLoss
            ? "bg-put/10 border-put"
            : "bg-card border-border"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-3">
          {isWin ? (
            <CheckCircle2 className="w-14 h-14 text-call" />
          ) : isLoss ? (
            <XCircle className="w-14 h-14 text-put" />
          ) : (
            <MinusCircle className="w-14 h-14 text-muted-foreground" />
          )}
        </div>
        <h3 className="text-2xl font-bold tracking-tight">
          {isWin ? "Vitória!" : isLoss ? "Derrota" : "Empate"}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">{popup.symbol}</p>
        <div
          className={`mt-4 text-3xl font-extrabold ${
            isWin ? "text-call" : isLoss ? "text-put" : "text-foreground"
          }`}
        >
          {popup.profit >= 0 ? "+" : ""}
          {brl(popup.profit)}
        </div>
        <button
          onClick={onClose}
          className="mt-5 w-full bg-secondary hover:bg-accent border border-border rounded-md py-2 text-sm font-medium"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
