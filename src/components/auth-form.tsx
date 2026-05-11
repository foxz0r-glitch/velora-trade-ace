import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, setToken } from "@/lib/api";
import { TrendingUp } from "lucide-react";

const COUNTRIES = [
  { code: "BR", name: "Brasil" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colômbia" },
  { code: "MX", name: "México" },
  { code: "PE", name: "Peru" },
  { code: "UY", name: "Uruguai" },
  { code: "PY", name: "Paraguai" },
  { code: "BO", name: "Bolívia" },
  { code: "EC", name: "Equador" },
  { code: "VE", name: "Venezuela" },
  { code: "US", name: "Estados Unidos" },
  { code: "PT", name: "Portugal" },
  { code: "ES", name: "Espanha" },
  { code: "GB", name: "Reino Unido" },
  { code: "DE", name: "Alemanha" },
  { code: "FR", name: "França" },
  { code: "IT", name: "Itália" },
  { code: "CA", name: "Canadá" },
  { code: "AU", name: "Austrália" },
  { code: "JP", name: "Japão" },
  { code: "CN", name: "China" },
  { code: "IN", name: "Índia" },
  { code: "ZA", name: "África do Sul" },
  { code: "NG", name: "Nigéria" },
  { code: "AO", name: "Angola" },
  { code: "MZ", name: "Moçambique" },
  { code: "OTHER", name: "Outro" },
];

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("BR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "register") return;
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((data) => {
        if (data?.country_code) {
          const found = COUNTRIES.find((c) => c.code === data.country_code);
          setCountry(found ? found.code : "OTHER");
        }
      })
      .catch(() => {});
  }, [mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res =
        mode === "login"
          ? await api.login(email, password)
          : await api.register({ email, password, name, lastName, phone, country });
      if (!res.accessToken) throw new Error("Token não recebido");
      setToken(res.accessToken);
      navigate({ to: "/trade" });
    } catch (err: any) {
      setError(err.message || "Erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
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

                <div>
                  <label className="text-xs font-medium text-muted-foreground">País de residência</label>
                  <select
                    className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    required
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Telefone / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="+55 11 99999-9999"
                    className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

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
