import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { getSocket } from "@/lib/socket";
import { api } from "@/lib/api";

type Candle = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
};

const TIMEFRAMES = [
  { label: "5s",   value: 5 },
  { label: "15s",  value: 15 },
  { label: "30s",  value: 30 },
  { label: "1m",   value: 60 },
  { label: "2m",   value: 120 },
  { label: "5m",   value: 300 },
  { label: "10m",  value: 600 },
  { label: "15m",  value: 900 },
  { label: "30m",  value: 1800 },
  { label: "1h",   value: 3600 },
  { label: "2h",   value: 7200 },
  { label: "4h",   value: 14400 },
];

export function PriceChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const candlesRef = useRef<Map<number, Candle>>(new Map());
  const lastPriceRef = useRef<number | null>(null);
  const tfRef = useRef<number>(60);
  const [timeframe, setTimeframe] = useState(60);

  // Chart setup — runs once
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
        rightOffset: 5,
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
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      candlesRef.current.clear();
    };
  }, []);

  // Load historical candles when symbol or timeframe changes
  useEffect(() => {
    tfRef.current = timeframe;
    if (!seriesRef.current) return;
    candlesRef.current.clear();
    lastPriceRef.current = null;

    api.candles(symbol, timeframe).then((data) => {
      if (!seriesRef.current) return;
      const candles: Candle[] = data.map((d) => ({
        time: d.time as UTCTimestamp,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));
      if (candles.length > 0) {
        candles.forEach((c) => candlesRef.current.set(Number(c.time), c));
        seriesRef.current.setData(candles);
        lastPriceRef.current = candles[candles.length - 1].close;
        chartRef.current?.timeScale().scrollToRealTime();
      }
    });
  }, [symbol, timeframe]);

  // Live price feed
  useEffect(() => {
    const socket = getSocket();
    socket.emit("subscribe:asset", symbol);

    const applyPrice = (price: number, ts?: number) => {
      if (!seriesRef.current) return;
      const tf = tfRef.current;
      const t = Math.floor((ts ?? Date.now()) / 1000);
      const bucket = t - (t % tf);
      const existing = candlesRef.current.get(bucket);
      const c: Candle = existing
        ? { time: bucket as UTCTimestamp, open: existing.open, high: Math.max(existing.high, price), low: Math.min(existing.low, price), close: price }
        : { time: bucket as UTCTimestamp, open: lastPriceRef.current ?? price, high: price, low: price, close: price };
      candlesRef.current.set(bucket, c);
      seriesRef.current.update(c);
      lastPriceRef.current = price;
    };

    const onUpdate = (msg: { symbol: string; price: number; timestamp?: number }) => {
      if (!msg || msg.symbol !== symbol) return;
      applyPrice(msg.price, msg.timestamp);
    };

    socket.on("price_update", onUpdate);

    return () => {
      socket.off("price_update", onUpdate);
      socket.emit("unsubscribe:asset", symbol);
    };
  }, [symbol]);

  return (
    <div className="relative w-full h-full">
      {/* Symbol badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/70 border border-border backdrop-blur-md shadow-lg">
        <span className="w-2 h-2 rounded-full bg-call animate-pulse" />
        <span className="text-sm font-bold tracking-wide">{symbol}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-l border-border pl-2">
          ao vivo
        </span>
      </div>

      {/* Timeframe selector */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-0.5 bg-card/70 border border-border rounded-lg backdrop-blur-md shadow-lg px-1.5 py-1">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.value}
            onClick={() => setTimeframe(tf.value)}
            className={`text-[11px] font-semibold px-2 py-1 rounded transition ${
              timeframe === tf.value
                ? "bg-call text-call-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
