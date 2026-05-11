export const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

export const num = (v: number, d = 5) =>
  Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
