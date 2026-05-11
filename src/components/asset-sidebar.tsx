import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  ChevronDown,
  Search,
  Star,
  DollarSign,
  Bitcoin,
  Droplet,
  BarChart3,
  LineChart,
  TrendingUp,
  X,
} from "lucide-react";

export type Asset = { id: string; name: string; symbol: string; payout: number };

type CategoryId = "favorites" | "currencies" | "crypto" | "commodities" | "stocks" | "indices";

const CATEGORIES: { id: CategoryId; label: string; icon: typeof DollarSign }[] = [
  { id: "currencies", label: "Currencies", icon: DollarSign },
  { id: "crypto", label: "Cryptocurrencies", icon: Bitcoin },
  { id: "commodities", label: "Commodities", icon: Droplet },
  { id: "stocks", label: "Stocks", icon: BarChart3 },
  { id: "indices", label: "Indices", icon: LineChart },
  { id: "favorites", label: "Favorites", icon: Star },
];

const CRYPTO_TOKENS = ["BTC", "ETH", "XRP", "LTC", "BNB", "SOL", "DOGE", "ADA", "DOT", "MATIC", "TRX", "AVAX", "LINK", "SHIB"];
const COMMODITY_TOKENS = ["XAU", "XAG", "OIL", "BRENT", "WTI", "GOLD", "SILVER", "GAS", "COPPER"];
const INDEX_TOKENS = ["SPX", "NDX", "DJI", "DAX", "FTSE", "NIKKEI", "IBOV", "US100", "US500", "US30"];

function classify(sym: string): CategoryId {
  const s = sym.toUpperCase();
  if (CRYPTO_TOKENS.some((t) => s.includes(t))) return "crypto";
  if (COMMODITY_TOKENS.some((t) => s.includes(t))) return "commodities";
  if (INDEX_TOKENS.some((t) => s.includes(t))) return "indices";
  // 6-letter pair like EURUSD or contains a slash → currency
  if (/^[A-Z]{3}[\/_-]?[A-Z]{3}/.test(s)) return "currencies";
  return "stocks";
}

export function AssetSidebar({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (a: Asset) => void;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<CategoryId>("currencies");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .assets()
      .then((d) => setAssets(Array.isArray(d) ? d : []))
      .catch(() => setError("Falha ao carregar"))
      .finally(() => setLoading(false));
  }, []);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selected = useMemo(
    () => assets.find((a) => a.id === selectedId) ?? null,
    [assets, selectedId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (q && !(a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q))) {
        return false;
      }
      if (category === "favorites") return favorites.has(a.id);
      return classify(a.symbol) === category;
    });
  }, [assets, query, category, favorites]);

  const toggleFav = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div ref={containerRef} className="relative inline-block">
        {/* Trigger box */}
        <button
          onClick={() => setOpen((v) => !v)}
          className={`w-56 flex items-center gap-2 rounded-md border px-3 py-2 text-left transition ${
            open ? "border-call bg-accent/40" : "border-border bg-input hover:bg-accent/30"
          }`}
        >
          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate leading-tight">
              {selected ? selected.symbol : "Selecionar ativo"}
            </div>
            <div className="text-[11px] text-call font-medium leading-tight">
              {selected ? `+${selected.payout}%` : "—"}
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown panel */}
        {open && (
          <div className="absolute left-0 top-full mt-2 z-50 w-[640px] max-w-[90vw] bg-panel border border-border rounded-lg shadow-2xl overflow-hidden flex">
            {/* Categories */}
            <div className="w-44 shrink-0 border-r border-border p-2 flex flex-col gap-1 bg-background/40">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = c.id === category;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-sm transition ${
                      active
                        ? "bg-accent text-call border border-call/40"
                        : "text-foreground/80 hover:bg-accent/40 border border-transparent"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="truncate">{c.label}</span>
                  </button>
                );
              })}
              <div className="mt-3 text-[10px] leading-snug text-muted-foreground px-1">
                Cotações fornecidas por bancos internacionais e formadores de mercado.
              </div>
            </div>

            {/* List */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="p-2 border-b border-border flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    autoFocus
                    placeholder="Buscar"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-input border border-border rounded-md pl-8 pr-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-3 py-1.5 flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <span>Ativo</span>
                <span>Payout</span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[420px]">
                {loading && (
                  <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
                )}
                {error && !loading && (
                  <div className="p-4 text-sm text-destructive">{error}</div>
                )}
                {!loading && !error && filtered.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Nenhum ativo encontrado
                  </div>
                )}
                {filtered.map((a) => {
                  const active = a.id === selectedId;
                  const isFav = favorites.has(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => {
                        onSelect(a);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left transition border-l-2 ${
                        active
                          ? "bg-accent/60 border-call"
                          : "border-transparent hover:bg-accent/40"
                      }`}
                    >
                      <Star
                        onClick={(e) => toggleFav(a.id, e)}
                        className={`w-4 h-4 shrink-0 transition ${
                          isFav
                            ? "fill-call text-call"
                            : "text-muted-foreground hover:text-call"
                        }`}
                      />
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{a.symbol}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{a.name}</div>
                      </div>
                      <div className="text-sm font-semibold text-call shrink-0">
                        +{a.payout}%
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
