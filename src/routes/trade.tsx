import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/top-bar";
import { AssetSidebar, type Asset } from "@/components/asset-sidebar";
import { PriceChart } from "@/components/price-chart";
import { TradePanel } from "@/components/trade-panel";
import { HistoryBar, type TradeRecord } from "@/components/history-bar";
import { ActiveTradesOverlay } from "@/components/active-trades-overlay";
import { ResultModal, type ResultPopup } from "@/components/result-modal";
import { useProfile } from "@/hooks/use-profile";
import { clearToken, getToken } from "@/lib/api";
import { disconnectSocket, getSocket } from "@/lib/socket";
import chartBg from "@/assets/chart-bg.jpg";
import {
  TrendingUp,
  Wallet,
  UserCircle2,
  ShoppingCart,
  Gem,
  Trophy,
  MessageCircle,
  HelpCircle,
  MoreHorizontal,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: TrendingUp, label: "Trading", active: true },
  { icon: Wallet, label: "Finance" },
  { icon: UserCircle2, label: "Perfil" },
  { icon: ShoppingCart, label: "Mercado" },
  { icon: Gem, label: "Conquistas", badge: true },
  { icon: Trophy, label: "Torneios" },
  { icon: MessageCircle, label: "Chat", count: 5 },
  { icon: HelpCircle, label: "Ajuda" },
  { icon: MoreHorizontal, label: "Mais" },
];

export const Route = createFileRoute("/trade")({
  head: () => ({ meta: [{ title: "Trade Room · Velora Broker" }] }),
  component: TradeRoom,
});

function TradeRoom() {
  const navigate = useNavigate();
  const { profile, refresh } = useProfile();
  const [selected, setSelected] = useState<Asset | null>(null);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [popup, setPopup] = useState<ResultPopup | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("accountMode") === "demo";
  });

  const toggleMode = () => {
    setIsDemo((prev) => {
      const next = !prev;
      localStorage.setItem("accountMode", next ? "demo" : "real");
      return next;
    });
  };

  // Auth gate (client-side)
  useEffect(() => {
    if (typeof window !== "undefined" && !getToken()) {
      navigate({ to: "/login" });
    }
  }, [navigate]);

  // Socket: trade results
  useEffect(() => {
    const socket = getSocket();
    const onResult = (msg: {
      tradeId: string;
      result: "WIN" | "LOSS" | "DRAW";
      profit: number;
      closePrice?: number;
      isDemo?: boolean;
    }) => {
      if (!msg) return;
      let symbol = "";
      setTrades((prev) =>
        prev.map((t) => {
          if (t.id === msg.tradeId) {
            symbol = t.assetSymbol;
            return { ...t, result: msg.result, profit: msg.profit, closePrice: msg.closePrice };
          }
          return t;
        })
      );
      setPopup({ result: msg.result, profit: msg.profit, symbol });
      refresh();
    };
    socket.on("trade_result", onResult);
    return () => {
      socket.off("trade_result", onResult);
    };
  }, [refresh]);

  useEffect(() => {
    return () => disconnectSocket();
  }, []);

  const handleTradePlaced = (trade: {
    id: string;
    assetSymbol: string;
    direction: "CALL" | "PUT";
    amount: number;
    duration: number;
    expiresAt: number;
  }) => {
    setTrades((prev) => [{ ...trade }, ...prev].slice(0, 30));
    refresh();
  };

  const handleLogout = () => {
    clearToken();
    disconnectSocket();
    navigate({ to: "/login" });
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar profile={profile} isDemo={isDemo} onToggleMode={toggleMode} onLogout={handleLogout} />
      <div className="flex-1 flex min-h-0">
        {/* Left vertical nav rail (PocketOption style) */}
        <nav className="w-[68px] shrink-0 bg-panel border-r border-border/60 flex flex-col items-stretch py-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={`relative group flex flex-col items-center justify-center gap-1.5 py-3 text-[10px] font-medium transition ${
                  item.active
                    ? "text-call bg-call/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <Icon className="w-[22px] h-[22px]" strokeWidth={1.75} />
                <span className="leading-none">{item.label}</span>
                {item.badge && (
                  <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-sky-400 ring-2 ring-panel" />
                )}
                {item.count && (
                  <span className="absolute top-1.5 right-3 min-w-[16px] h-[16px] px-1 rounded-full bg-sky-500 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-panel">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex min-h-0">
            {/* Chart area with mountain backdrop + overlaid asset selector */}
            <div
              className="flex-1 relative overflow-hidden"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(13,22,32,0.30) 0%, rgba(13,22,32,0.50) 55%, rgba(13,22,32,0.78) 100%), url(${chartBg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {/* Asset selector floats over chart */}
              <div className="absolute top-3 left-3 z-20">
                <AssetSidebar selectedId={selected?.id ?? null} onSelect={setSelected} />
              </div>

              {selected ? (
                <>
                  <PriceChart symbol={selected.symbol} />
                  <ActiveTradesOverlay trades={trades} />
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Selecione um ativo no canto superior esquerdo
                </div>
              )}
            </div>

            <TradePanel asset={selected} isDemo={isDemo} onTradePlaced={handleTradePlaced} />

            {/* Far-right decorative icon rail (PocketOption style) */}
            <aside className="w-14 shrink-0 bg-panel border-l border-border/60 flex flex-col items-center py-2 gap-1">
              {[
                { Icon: TrendingUp, label: "Trades" },
                { Icon: Wallet, label: "Sinais" },
                { Icon: UserCircle2, label: "Social" },
                { Icon: Gem, label: "Express" },
                { Icon: Trophy, label: "Pendentes" },
                { Icon: HelpCircle, label: "Atalhos" },
              ].map(({ Icon, label }) => (
                <button
                  key={label}
                  className="w-full flex flex-col items-center gap-1 py-2.5 text-[9px] text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-md transition"
                >
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                  <span className="leading-none">{label}</span>
                </button>
              ))}
            </aside>
          </div>
          <HistoryBar trades={trades} />
        </main>
      </div>
      <ResultModal popup={popup} onClose={() => setPopup(null)} />
    </div>
  );
}
