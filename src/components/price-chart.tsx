import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { getSocket } from "@/lib/socket";

type Candle = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
};

const CANDLE_SECONDS = 5;

export function PriceChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const candlesRef = useRef<Map<number, Candle>>(new Map());
  const lastPriceRef = useRef<number | null>(null);

  // Chart setup
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: "#2A3144",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "#23283B" },
        horzLines: { color: "#23283B" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: "#2A3144",
      },
      rightPriceScale: { borderColor: "#2A3144" },
      crosshair: { mode: 1 },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#45B734",
      downColor: "#FF3E1F",
      borderUpColor: "#45B734",
      borderDownColor: "#FF3E1F",
      wickUpColor: "#45B734",
      wickDownColor: "#FF3E1F",
    });
    chartRef.current = chart;
    seriesRef.current = series;

    // seed with synthetic candles based on a baseline so the chart is visible immediately
    const now = Math.floor(Date.now() / 1000);
    const base = 100 + Math.random() * 50;
    let p = base;
    const seed: Candle[] = [];
    for (let i = 300; i >= 1; i--) {
      const t = (now - i * CANDLE_SECONDS) as UTCTimestamp;
      const o = p;
      const c = o + (Math.random() - 0.5) * 0.6;
      const h = Math.max(o, c) + Math.random() * 0.3;
      const l = Math.min(o, c) - Math.random() * 0.3;
      seed.push({ time: t, open: o, high: h, low: l, close: c });
      candlesRef.current.set(Number(t), seed[seed.length - 1]);
      p = c;
    }
    series.setData(seed);
    lastPriceRef.current = p;
    chart.timeScale().scrollToRealTime();

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      candlesRef.current.clear();
    };
  }, []);

  // Reset on symbol change (re-seed)
  useEffect(() => {
    if (!seriesRef.current) return;
    candlesRef.current.clear();
    const now = Math.floor(Date.now() / 1000);
    const base = 100 + Math.random() * 50;
    let p = base;
    const seed: Candle[] = [];
    for (let i = 300; i >= 1; i--) {
      const t = (now - i * CANDLE_SECONDS) as UTCTimestamp;
      const o = p;
      const c = o + (Math.random() - 0.5) * 0.6;
      const h = Math.max(o, c) + Math.random() * 0.3;
      const l = Math.min(o, c) - Math.random() * 0.3;
      seed.push({ time: t, open: o, high: h, low: l, close: c });
      candlesRef.current.set(Number(t), seed[seed.length - 1]);
      p = c;
    }
    seriesRef.current.setData(seed);
    lastPriceRef.current = p;
    chartRef.current?.timeScale().scrollToRealTime();
  }, [symbol]);

  // Price updates via socket + simulated drift fallback
  useEffect(() => {
    const socket = getSocket();

    const onUpdate = (msg: { symbol: string; price: number; timestamp?: number }) => {
      if (!msg || msg.symbol !== symbol) return;
      applyPrice(msg.price, msg.timestamp);
    };

    const applyPrice = (price: number, ts?: number) => {
      if (!seriesRef.current) return;
      const t = Math.floor((ts ?? Date.now()) / 1000);
      const bucket = t - (t % CANDLE_SECONDS);
      const existing = candlesRef.current.get(bucket);
      const c: Candle = existing
        ? {
            time: bucket as UTCTimestamp,
            open: existing.open,
            high: Math.max(existing.high, price),
            low: Math.min(existing.low, price),
            close: price,
          }
        : {
            time: bucket as UTCTimestamp,
            open: lastPriceRef.current ?? price,
            high: price,
            low: price,
            close: price,
          };
      candlesRef.current.set(bucket, c);
      seriesRef.current.update(c);
      lastPriceRef.current = price;
    };

    socket.on("price_update", onUpdate);

    // fallback simulated drift if socket has no data
    const interval = setInterval(() => {
      const last = lastPriceRef.current ?? 100;
      const next = last + (Math.random() - 0.5) * 0.4;
      applyPrice(next);
    }, 1000);

    return () => {
      socket.off("price_update", onUpdate);
      clearInterval(interval);
    };
  }, [symbol]);

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/70 border border-border backdrop-blur-md shadow-lg">
        <span className="w-2 h-2 rounded-full bg-call animate-pulse" />
        <span className="text-sm font-bold tracking-wide">{symbol}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-l border-border pl-2">
          ao vivo
        </span>
      </div>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
