import { brl } from "@/lib/format";
import { LogOut, Gift, ChevronDown, Plus } from "lucide-react";
import type { Profile } from "@/hooks/use-profile";

interface TopBarProps {
  profile: Profile | null;
  isDemo: boolean;
  onToggleMode: () => void;
  onLogout: () => void;
}

export function TopBar({ profile, isDemo, onToggleMode, onLogout }: TopBarProps) {
  const balance = isDemo ? (profile?.demoBalance ?? 0) : (profile?.balance ?? 0);
  const initial = (profile?.name || profile?.email || "U").charAt(0).toUpperCase();

  return (
    <header className="h-16 shrink-0 bg-panel/80 backdrop-blur border-b border-border flex items-center px-4 gap-3">
      {/* Brand */}
      <div className="flex items-center gap-2.5 pr-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-call to-emerald-700 flex items-center justify-center shadow-lg shadow-call/20">
          <span className="text-call-foreground font-black text-lg">V</span>
        </div>
        <div className="leading-tight">
          <div className="font-bold tracking-tight text-sm">Velora</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Broker</div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Bonus pill */}
        <button className="hidden md:flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500/15 to-call/15 border border-sky-500/30 px-3 py-1.5 hover:brightness-110 transition">
          <Gift className="w-4 h-4 text-sky-400" />
          <div className="leading-tight text-left">
            <div className="text-[10px] font-bold text-sky-300 uppercase tracking-wider">Bônus 50%</div>
            <div className="text-[9px] text-muted-foreground">no primeiro depósito</div>
          </div>
        </button>

        {/* Account selector — Real / Demo */}
        <div className="flex items-stretch rounded-lg bg-secondary/70 border border-border overflow-hidden">
          <div className="flex flex-col px-3 py-1 justify-center min-w-[140px]">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${isDemo ? "bg-amber-400" : "bg-call"} animate-pulse`}
              />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {isDemo ? "Conta Demo" : "Conta Real"}
              </span>
            </div>
            <div className={`text-base font-bold leading-tight ${isDemo ? "text-amber-400" : "text-call"}`}>
              {brl(balance)}
            </div>
          </div>
          <button
            onClick={onToggleMode}
            title="Trocar conta"
            className="px-2 border-l border-border hover:bg-accent transition flex items-center"
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Top up CTA */}
        <button className="hidden sm:flex items-center gap-1.5 bg-call hover:brightness-110 text-call-foreground font-bold text-sm px-4 py-2 rounded-lg shadow-lg shadow-call/30 transition">
          <Plus className="w-4 h-4" strokeWidth={3} />
          Depositar
        </button>

        {/* Avatar */}
        <div className="relative ml-1">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 border border-border flex items-center justify-center text-sm font-bold text-white">
            {initial}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-call ring-2 ring-panel" />
        </div>

        <button
          onClick={onLogout}
          title="Sair"
          className="ml-1 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
