export const API_BASE = "https://velorabroker.com";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export function setToken(token: string) {
  localStorage.setItem("accessToken", token);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

export function setRefreshToken(token: string) {
  localStorage.setItem("refreshToken", token);
}

export function clearToken() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

// Singleton — evita múltiplas chamadas de refresh simultâneas
let _refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    const rt = getRefreshToken();
    if (!rt) return false;
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) { clearToken(); return false; }
      const data = await res.json();
      setToken(data.accessToken);
      if (data.refreshToken) setRefreshToken(data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  _retry = true
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && _retry) {
    const ok = await tryRefresh();
    if (ok) return apiFetch(path, options, false);
    clearToken();
    window.location.href = "/login";
    throw new Error("Sessão expirada");
  }

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data.message || data.error || msg;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// API endpoints
export const api = {
  login: (email: string, password: string) =>
    apiFetch<{ accessToken: string; refreshToken?: string; user?: any }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (payload: { email: string; password: string; name: string; lastName?: string; phone?: string; country?: string; currency?: string }) =>
    apiFetch<{ accessToken: string; refreshToken?: string; user?: any }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  profile: () => apiFetch<{ id: string; name: string; email: string; balance: number; demoBalance: number }>("/api/users/me"),
  assets: async () => {
    const data = await apiFetch<Array<{ id: string; name: string; symbol: string; payoutPercent: number }>>("/api/trading/assets");
    return data.map((a) => ({ ...a, payout: Number(a.payoutPercent) }));
  },
  trade: (body: { assetId: string; direction: "CALL" | "PUT"; amount: number; duration: number; isDemo?: boolean }) =>
    apiFetch<{ id: string; openPrice: number; expiresAt: string }>("/api/trading/trade", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  history: () => apiFetch<Array<any>>("/api/users/me/trades").catch(() => []),
  candles: (symbol: string, resolution: number, limit?: number) =>
    apiFetch<Array<{ time: number; open: number; high: number; low: number; close: number }>>(
      `/api/trading/candles?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}${limit ? `&limit=${limit}` : ""}`
    ).catch(() => []),
};
