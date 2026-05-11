import { brl } from "@/lib/format";
import { LogOut, Wallet, User } from "lucide-react";
import type { Profile } from "@/hooks/use-profile";

export function TopBar({ profile, onLogout }: { profile: Profile | null; onLogout: () => void }) {
  return (
    <header className="h-14 shrink-0 bg-panel border-b border-border flex items-center px-4 gap-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-call/20 flex items-center justify-center">
          <span className="text-call font-bold">V</span>
        </div>
        <span className="font-bold tracking-tight">Velora Broker</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2 bg-secondary/60 border border-border rounded-md px-3 py-1.5">
          <Wallet className="w-4 h-4 text-call" />
          <div className="text-xs text-muted-foreground">Saldo</div>
          <div className="text-sm font-bold text-call">{brl(profile?.balance ?? 0)}</div>
        </div>

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
