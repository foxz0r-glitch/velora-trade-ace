import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Copy, Zap } from "lucide-react";

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Method {
  name: string;
  time: string;
  iconBg: string;
  iconText: string;
  initials: string;
}

const RECOMMENDED: Method[] = [
  { name: "PIX (Apenas seu CPF)", time: "1–6 horas", iconBg: "bg-emerald-500/20", iconText: "text-emerald-400", initials: "PIX" },
  { name: "Visa / Mastercard", time: "Instantâneo", iconBg: "bg-blue-500/20", iconText: "text-blue-300", initials: "VM" },
  { name: "PicPay (Apenas seu CPF)", time: "3–60 minutos", iconBg: "bg-green-500/20", iconText: "text-green-400", initials: "P" },
];

const CRYPTO: Method[] = [
  { name: "Outras cryptos", time: "5–60 minutos", iconBg: "bg-orange-500/20", iconText: "text-orange-400", initials: "C" },
  { name: "Binance Coin (BNB)", time: "5–60 minutos", iconBg: "bg-yellow-500/20", iconText: "text-yellow-400", initials: "B" },
  { name: "Bitcoin (BTC)", time: "5–60 minutos", iconBg: "bg-orange-600/20", iconText: "text-orange-500", initials: "₿" },
  { name: "Cardano (ADA)", time: "5–60 minutos", iconBg: "bg-blue-600/20", iconText: "text-blue-400", initials: "A" },
  { name: "Ethereum (ETH) ERC-20", time: "5–60 minutos", iconBg: "bg-indigo-500/20", iconText: "text-indigo-300", initials: "Ξ" },
  { name: "Litecoin (LTC)", time: "5–60 minutos", iconBg: "bg-slate-400/20", iconText: "text-slate-200", initials: "Ł" },
  { name: "Ripple (XRP)", time: "5–60 minutos", iconBg: "bg-zinc-700/40", iconText: "text-zinc-200", initials: "X" },
  { name: "Tether (USDT) TRC20", time: "5–60 minutos", iconBg: "bg-teal-500/20", iconText: "text-teal-300", initials: "T" },
];

const OTHER: Method[] = [
  { name: "Volet.com", time: "Instantâneo", iconBg: "bg-zinc-800", iconText: "text-white", initials: "V" },
];

function MethodCard({ m }: { m: Method }) {
  return (
    <button
      type="button"
      className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 hover:bg-accent hover:border-border/80 transition p-3 text-left"
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${m.iconBg} ${m.iconText}`}>
        {m.initials}
      </div>
      <div className="leading-tight">
        <div className="text-sm font-medium text-foreground">{m.name}</div>
        <div className="text-xs text-muted-foreground">{m.time}</div>
      </div>
    </button>
  );
}

function Section({ title, subtitle, methods }: { title: string; subtitle?: string; methods: Method[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground/80 mt-1">{subtitle}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {methods.map((m) => (
          <MethodCard key={m.name} m={m} />
        ))}
      </div>
    </section>
  );
}

export function DepositModal({ open, onOpenChange }: DepositModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-panel border-border">
        <DialogHeader className="flex flex-row items-center justify-between gap-4 pr-8">
          <DialogTitle className="text-2xl font-bold">Método de pagamento</DialogTitle>
          <div className="relative w-72 hidden md:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar método de pagamento"
              className="w-full bg-secondary/60 border border-border rounded-md pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
          </div>
        </DialogHeader>

        {/* Bonus banner */}
        <div className="relative overflow-hidden rounded-xl border border-violet-500/40 bg-gradient-to-r from-violet-900/60 via-violet-700/50 to-fuchsia-700/40 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-yellow-300" fill="currentColor" />
            <div>
              <div className="font-bold text-white">Bônus de até 100%</div>
              <div className="text-xs text-white/80">Receba um bônus em depósitos de $10 ou mais</div>
            </div>
          </div>
          <div className="text-right">
            <button className="flex items-center gap-2 border border-white/40 rounded-md px-3 py-1.5 text-sm font-bold text-white hover:bg-white/10 transition">
              VELORAWELCOME
              <Copy className="w-3.5 h-3.5" />
            </button>
            <div className="text-[10px] text-white/70 mt-1">Expira em 18/05/2026</div>
          </div>
        </div>

        <div className="space-y-6 pt-2">
          <Section title="Recomendados" methods={RECOMMENDED} />
          <Section
            title="Depósito em Crypto"
            subtitle="Quando você faz um depósito usando métodos Crypto, a criptomoeda selecionada é convertida para a moeda do seu saldo."
            methods={CRYPTO}
          />
          <Section title="Outros métodos" methods={OTHER} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
