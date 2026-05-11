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

type ServerCandle = { time: number; open: number; high: number; low: number; close: number };

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
  const chartRef     = useRef<IChartApi | null>(null);
  const seriesRef    = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const candlesRef   = useRef<Map<number, Candle>>(new Map());
  const lastPriceRef = useRef<number | null>(null);
  const tfRef        = useRef<number>(60);

  // Animação do close (lerp local, 60fps)
  const targetCloseRef = useRef<number | null>(null);
  const animCloseRef   = useRef<number | null>(null);

  // Wick rastreado LOCALMENTE — o corpo nunca fica abaixo/acima do wick
  // Sincronizado com o servidor apenas no momento de conexão (candle_snapshot)
  const animHighRef  = useRef<number | null>(null);
  const animLowRef   = useRef<number | null>(null);

  const lastBucketRef = useRef<number>(-1);
  const rafRef        = useRef<number>(0);
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
    chartRef.current  = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current  = null;
      seriesRef.current = null;
      candlesRef.current.clear();
    };
  }, []);

  // Carrega histórico quando símbolo ou timeframe muda
  useEffect(() => {
    tfRef.current        = timeframe;
    targetCloseRef.current = null;
    animCloseRef.current   = null;
    animHighRef.current    = null;
    animLowRef.current     = null;
    lastBucketRef.current  = -1;
    if (!seriesRef.current) return;
    candlesRef.current.clear();
    lastPriceRef.current = null;

    api.candles(symbol, timeframe).then((data) => {
      if (!seriesRef.current) return;
      const candles: Candle[] = data.map((d) => ({
        time:  d.time as UTCTimestamp,
        open:  d.open,
        high:  d.high,
        low:   d.low,
        close: d.close,
      }));
      if (candles.length > 0) {
        candles.forEach((c) => candlesRef.current.set(Number(c.time), c));
        seriesRef.current.setData(candles);
        const last = candles[candles.length - 1].close;
        lastPriceRef.current   = last;
        targetCloseRef.current = last;
        animCloseRef.current   = last;
        chartRef.current?.timeScale().scrollToRealTime();
      }
    });
  }, [symbol, timeframe]);

  // Polling de resiliência — mantém candlesRef atualizado se socket cair
  useEffect(() => {
    const sync = async () => {
      if (!seriesRef.current) return;
      const data = await api.candles(symbol, timeframe, 3);
      if (!data.length) return;
      const nowSec = Math.floor(Date.now() / 1000);
      const currentBucket = nowSec - (nowSec % timeframe);
      for (const d of data) {
        if (d.time >= currentBucket) {
          // Atualiza só o open do candle atual (para o rAF usar o open correto)
          const existing = candlesRef.current.get(d.time);
          candlesRef.current.set(d.time, {
            time:  d.time as UTCTimestamp,
            open:  d.open,
            high:  existing?.high  ?? d.high,
            low:   existing?.low   ?? d.low,
            close: d.close,
          });
        }
      }
      // Só atualiza target se socket não está ativo (resiliência)
      if (!lastPriceRef.current) {
        const last = data[data.length - 1];
        targetCloseRef.current = last.close;
        lastPriceRef.current   = last.close;
      }
    };
    const interval = setInterval(sync, 3000);
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  // Loop de animação + feed de preços em tempo real
  useEffect(() => {
    const socket = getSocket();

    // rAF: interpola o close em direção ao alvo a 60fps.
    // animHigh/animLow rastreados LOCALMENTE — corpo sempre alcança o wick antes de ele crescer.
    const loop = () => {
      const target = targetCloseRef.current;
      if (target !== null && seriesRef.current) {
        if (animCloseRef.current === null) animCloseRef.current = target;
        const cur  = animCloseRef.current;
        const diff = target - cur;
        const next = Math.abs(diff) < 0.0000001 ? target : cur + diff * 0.05;
        animCloseRef.current = next;

        const tf      = tfRef.current;
        const nowSec  = Math.floor(Date.now() / 1000);
        const bucket  = nowSec - (nowSec % tf);
        const existing = candlesRef.current.get(bucket);

        if (existing) {
          // Novo bucket: reseta o wick local para o open (mesmo open do servidor)
          if (bucket !== lastBucketRef.current) {
            lastBucketRef.current  = bucket;
            animCloseRef.current   = existing.open;
            animHighRef.current    = existing.open;
            animLowRef.current     = existing.open;
          }

          // Wick local: só cresce onde o corpo animado chegou — sem race condition
          if (animHighRef.current === null) animHighRef.current = next;
          if (animLowRef.current  === null) animLowRef.current  = next;
          animHighRef.current = Math.max(animHighRef.current, next);
          animLowRef.current  = Math.min(animLowRef.current,  next);

          const c: Candle = {
            time:  bucket as UTCTimestamp,
            open:  existing.open,
            high:  animHighRef.current,
            low:   animLowRef.current,
            close: next,
          };
          try { seriesRef.current.update(c); } catch {}
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    // Aplica candle do servidor no timeframe atual (para manter open correto em candlesRef)
    const applyServerCandle = (candles: Record<number, ServerCandle>) => {
      const tf     = tfRef.current;
      const candle = candles[tf];
      if (!candle) return;
      // Preserva high/low local; só atualiza open e close (fontes do servidor)
      const existing = candlesRef.current.get(candle.time);
      candlesRef.current.set(candle.time, {
        time:  candle.time as UTCTimestamp,
        open:  candle.open,
        high:  existing?.high ?? candle.high,
        low:   existing?.low  ?? candle.low,
        close: candle.close,
      });
    };

    const onUpdate = (msg: {
      symbol: string;
      price: number;
      timestamp?: number;
      candles?: Record<number, ServerCandle>;
    }) => {
      if (!msg || msg.symbol !== symbol) return;
      if (msg.candles) applyServerCandle(msg.candles);
      targetCloseRef.current = msg.price;
      lastPriceRef.current   = msg.price;
    };

    // Snapshot ao conectar: sincroniza posição inicial do wick com o servidor
    // (todos os clientes começam do mesmo ponto — divergência posterior é < 1 frame)
    const onSnapshot = (msg: { symbol: string; candles: Record<number, ServerCandle> }) => {
      if (!msg || msg.symbol !== symbol) return;
      const tf     = tfRef.current;
      const candle = msg.candles[tf];
      if (!candle) return;

      candlesRef.current.set(candle.time, {
        time:  candle.time as UTCTimestamp,
        open:  candle.open,
        high:  candle.high,
        low:   candle.low,
        close: candle.close,
      });

      // Inicializa animação a partir do estado atual do servidor
      targetCloseRef.current = candle.close;
      lastPriceRef.current   = candle.close;
      if (animCloseRef.current === null) animCloseRef.current = candle.close;

      // Ponto de partida do wick local = wick atual do servidor
      // (todos os clientes recebem o mesmo snapshot → mesmo ponto inicial)
      if (animHighRef.current === null) animHighRef.current = candle.high;
      if (animLowRef.current  === null) animLowRef.current  = candle.low;
    };

    const subscribe = () => socket.emit("subscribe:asset", symbol);
    subscribe();
    socket.on("connect",        subscribe);
    socket.on("price_update",   onUpdate);
    socket.on("candle_snapshot", onSnapshot);

    return () => {
      cancelAnimationFrame(rafRef.current);
      socket.off("connect",        subscribe);
      socket.off("price_update",   onUpdate);
      socket.off("candle_snapshot", onSnapshot);
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
