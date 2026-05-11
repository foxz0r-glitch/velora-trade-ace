import { brl } from "@/lib/format";
import { LogOut, Wallet, User } from "lucide-react";
import type { Profile } from "@/hooks/use-profile";

interface TopBarProps {
  profile: Profile | null;
  isDemo: boolean;
  onToggleMode: () => void;
  onLogout: () => void;
}

export function TopBar({ profile, isDemo, onToggleMode, onLogout }: TopBarProps) {
  const balance = isDemo ? (profile?.demoBalance ?? 0) : (profile?.balance ?? 0);

  return (
    <header className="h-14 shrink-0 bg-panel border-b border-border flex items-center px-4 gap-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-call/20 flex items-center justify-center">
          <span className="text-call font-bold">V</span>
        </div>
        <span className="font-bold tracking-tight">Velora Broker</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Real / Demo toggle */}
        <div className="flex items-center rounded-md border border-border overflow-hidden text-xs font-semibold">
          <button
            onClick={() => isDemo && onToggleMode()}
            className={`px-3 py-1.5 transition ${
              !isDemo
                ? "bg-call text-call-foreground"
                : "bg-secondary text-muted-foreground hover:bg-accent"
            }`}
          >
            Real
          </button>
          <button
            onClick={() => !isDemo && onToggleMode()}
            className={`px-3 py-1.5 transition ${
              isDemo
                ? "bg-amber-500 text-white"
                : "bg-secondary text-muted-foreground hover:bg-accent"
            }`}
          >
            Demo
          </button>
        </div>

        {/* Balance */}
        <div className={`flex items-center gap-2 border rounded-md px-3 py-1.5 ${
          isDemo
            ? "bg-amber-500/10 border-amber-500/40"
            : "bg-secondary/60 border-border"
        }`}>
          <Wallet className={`w-4 h-4 ${isDemo ? "text-amber-500" : "text-call"}`} />
          <div className="text-xs text-muted-foreground">{isDemo ? "Demo" : "Saldo"}</div>
          <div className={`text-sm font-bold ${isDemo ? "text-amber-500" : "text-call"}`}>
            {brl(balance)}
          </div>
        </div>

        {/* User */}
        <div className="flex items-center gap-2 px-2">
          <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium hidden sm:block">
            {profile?.name || profile?.email || "—"}
          </span>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border bg-secondary hover:bg-accent transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
      </div>
    </header>
  );
}
