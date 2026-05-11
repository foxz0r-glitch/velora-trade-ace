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

type LiveCandle = { time: number; open: number; high: number; low: number; close: number };

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
  const targetCloseRef = useRef<number | null>(null);
  const animCloseRef = useRef<number | null>(null);
  const lastBucketRef = useRef<number>(-1);
  const rafRef = useRef<number>(0);
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
      priceFormat: { type: "price", precision: 6, minMove: 0.000001 },
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
    targetCloseRef.current = null;
    animCloseRef.current = null;
    lastBucketRef.current = -1;
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
        const last = candles[candles.length - 1].close;
        lastPriceRef.current = last;
        targetCloseRef.current = last;
        animCloseRef.current = last;
        chartRef.current?.timeScale().scrollToRealTime();
      }
    });
  }, [symbol, timeframe]);

  // Polling de resiliência: mantém candlesRef atualizado se socket cair
  useEffect(() => {
    const sync = async () => {
      if (!seriesRef.current) return;
      const data = await api.candles(symbol, timeframe, 3);
      if (!data.length) return;
      const nowSec = Math.floor(Date.now() / 1000);
      const currentBucket = nowSec - (nowSec % timeframe);
      for (const d of data) {
        if (d.time >= currentBucket) {
          candlesRef.current.set(d.time, {
            time: d.time as UTCTimestamp,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          });
        }
      }
    };
    const interval = setInterval(sync, 3000);
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  // Loop de animação + feed de preços em tempo real
  useEffect(() => {
    const socket = getSocket();
    let lastRealTickAt = 0;

    // rAF: interpola o close quadro a quadro (60fps) em direção ao alvo
    // open/high/low vêm do servidor — iguais para todos os clientes
    const loop = () => {
      const target = targetCloseRef.current;
      if (target !== null && seriesRef.current) {
        if (animCloseRef.current === null) animCloseRef.current = target;
        const cur = animCloseRef.current;
        const diff = target - cur;
        const next = Math.abs(diff) < 0.0000001 ? target : cur + diff * 0.05;
        animCloseRef.current = next;

        const tf = tfRef.current;
        const nowSec = Math.floor(Date.now() / 1000);
        const bucket = nowSec - (nowSec % tf);
        const existing = candlesRef.current.get(bucket);
        if (existing) {
          if (bucket !== lastBucketRef.current) {
            lastBucketRef.current = bucket;
            animCloseRef.current = existing.open;
          }
          const c: Candle = {
            time:  bucket as UTCTimestamp,
            open:  existing.open,
            high:  existing.high,
            low:   existing.low,
            close: animCloseRef.current,
          };
          try { seriesRef.current.update(c); } catch {}
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    // Aplica candle do servidor no timeframe atual
    const applyServerCandle = (candles: Record<number, LiveCandle>) => {
      const tf = tfRef.current;
      const candle = candles[tf];
      if (!candle) return;
      candlesRef.current.set(candle.time, {
        time:  candle.time as UTCTimestamp,
        open:  candle.open,
        high:  candle.high,
        low:   candle.low,
        close: candle.close,
      });
    };

    const onUpdate = (msg: {
      symbol: string;
      price: number;
      timestamp?: number;
      candles?: Record<number, LiveCandle>;
    }) => {
      if (!msg || msg.symbol !== symbol) return;
      lastRealTickAt = Date.now();
      if (msg.candles) applyServerCandle(msg.candles);
      targetCloseRef.current = msg.price;
      lastPriceRef.current = msg.price;
    };

    const onSnapshot = (msg: { symbol: string; candles: Record<number, LiveCandle> }) => {
      if (!msg || msg.symbol !== symbol) return;
      applyServerCandle(msg.candles);
      const tf = tfRef.current;
      const candle = msg.candles[tf];
      if (candle) {
        targetCloseRef.current = candle.close;
        lastPriceRef.current = candle.close;
        if (animCloseRef.current === null) animCloseRef.current = candle.close;
      }
    };

    const subscribe = () => socket.emit("subscribe:asset", symbol);
    subscribe();
    socket.on("connect", subscribe);
    socket.on("price_update", onUpdate);
    socket.on("candle_snapshot", onSnapshot);

    // Drift: só ativa se sem tick real por 3s
    const driftInterval = setInterval(() => {
      if (Date.now() - lastRealTickAt < 3000) return;
      const last = lastPriceRef.current;
      if (!last) return;
      targetCloseRef.current = last + (Math.random() - 0.5) * 0.0002 * last;
    }, 1000);

    return () => {
      cancelAnimationFrame(rafRef.current);
      socket.off("connect", subscribe);
      socket.off("price_update", onUpdate);
      socket.off("candle_snapshot", onSnapshot);
      socket.emit("unsubscribe:asset", symbol);
      clearInterval(driftInterval);
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
