import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TrendingUp } from "lucide-react";

export type Asset = { id: string; name: string; symbol: string; payout: number };

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

  useEffect(() => {
    api
      .assets()
      .then((d) => setAssets(Array.isArray(d) ? d : []))
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.symbol.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <aside className="w-64 shrink-0 bg-panel border-r border-border flex flex-col">
      <div className="p-3 border-b border-border">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
          Ativos
        </div>
        <input
          placeholder="Buscar ativo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-input border border-border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">Nenhum ativo</div>
        )}
        {filtered.map((a) => {
          const active = a.id === selectedId;
          return (
            <button
              key={a.id}
              onClick={() => onSelect(a)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-left border-l-2 transition hover:bg-accent ${
                active
                  ? "bg-accent border-call"
                  : "border-transparent"
              }`}
            >
              <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{a.symbol}</div>
                <div className="text-xs text-muted-foreground truncate">{a.name}</div>
              </div>
              <div className="text-xs font-semibold text-call">{a.payout}%</div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
