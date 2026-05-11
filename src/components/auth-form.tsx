import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, setToken, setRefreshToken } from "@/lib/api";
import { COUNTRIES, getCountry } from "@/lib/countries";
import { TrendingUp } from "lucide-react";

const CURRENCIES = [
  { code: "USD", label: "USD — Dólar Americano" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — Libra Esterlina" },
  { code: "BRL", label: "BRL — Real Brasileiro" },
];

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("BR");
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentCountry = getCountry(countryCode);

  useEffect(() => {
    if (mode !== "register") return;
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((data) => {
        if (data?.country_code) {
          const found = COUNTRIES.find((c) => c.code === data.country_code);
          if (found) setCountryCode(found.code);
        }
      })
      .catch(() => {});
  }, [mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fullPhone = phone ? `${currentCountry.ddi} ${phone}` : undefined;
      const res =
        mode === "login"
          ? await api.login(email, password)
          : await api.register({
              email,
              password,
              name,
              lastName,
              phone: fullPhone,
              country: countryCode,
              currency,
            });
      if (!res.accessToken) throw new Error("Token não recebido");
      setToken(res.accessToken);
      if (res.refreshToken) setRefreshToken(res.refreshToken);
      navigate({ to: "/trade" });
    } catch (err: any) {
      setError(err.message || "Erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-call/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-call" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Velora Broker</h1>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-2xl">
          <h2 className="text-xl font-semibold mb-1">
            {mode === "login" ? "Entrar na sua conta" : "Criar conta"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "login" ? "Acesse o trade room" : "Comece a operar agora"}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <>
                {/* Nome + Sobrenome */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Nome</label>
                    <input
                      className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Sobrenome</label>
                    <input
                      className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* País */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">País de residência</label>
                  <select
                    className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    required
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Telefone com DDI */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Telefone / WhatsApp</label>
                  <div className="mt-1 flex items-stretch">
                    <span className="inline-flex items-center px-3 bg-secondary border border-r-0 border-border rounded-l-md text-sm font-medium text-muted-foreground shrink-0">
                      {currentCountry.ddi}
                    </span>
                    <input
                      type="tel"
                      className="flex-1 bg-input border border-border rounded-r-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder={currentCountry.phonePlaceholder}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Moeda */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Moeda da conta</label>
                  <select
                    className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* E-mail */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">E-mail</label>
              <input
                type="email"
                className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Senha */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Senha</label>
              <input
                type="password"
                className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              {mode === "register" && (
                <p className="text-[11px] text-muted-foreground mt-1">Mín. 8 caracteres, 1 maiúscula e 1 número</p>
              )}
            </div>

            {error && (
              <div className="text-sm text-put bg-put/10 border border-put/30 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-call text-call-foreground font-semibold py-2.5 rounded-md hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>

            {/* Disclaimer legal */}
            {mode === "register" && (
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                Ao criar uma conta, você aceita nossos{" "}
                <Link to="/terms" className="underline hover:text-foreground">Termos e Condições</Link>,
                {" "}a{" "}
                <Link to="/privacy" className="underline hover:text-foreground">Política de Privacidade</Link>
                {" "}e a{" "}
                <Link to="/execution" className="underline hover:text-foreground">Política de Execução de Ordens</Link>
                {" "}e confirma que você tem 18 anos de idade ou mais.
              </p>
            )}
          </form>

          <p className="text-sm text-muted-foreground mt-4 text-center">
            {mode === "login" ? (
              <>
                Não tem conta?{" "}
                <Link to="/register" className="text-call hover:underline">
                  Cadastre-se
                </Link>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <Link to="/login" className="text-call hover:underline">
                  Entrar
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
