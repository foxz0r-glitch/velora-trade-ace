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
  const tfRef        = useRef<number>(60);

  // Lerp sincronizado: close + high + low animam JUNTOS em direção aos valores raw do servidor
  const targetCloseRef = useRef<number | null>(null);
  const targetHighRef  = useRef<number | null>(null);
  const targetLowRef   = useRef<number | null>(null);

  const animCloseRef = useRef<number | null>(null);
  const animHighRef  = useRef<number | null>(null);
  const animLowRef   = useRef<number | null>(null);

  // Tempo do bucket atual VINDO DO SERVIDOR — fonte autoritativa para detectar
  // transição de bucket. Não dá pra usar Date.now() do cliente (skew de relógio).
  const serverBucketRef = useRef<number>(-1);
  const lastBucketRef   = useRef<number>(-1);
  const rafRef          = useRef<number>(0);
  const [timeframe, setTimeframe] = useState(60);

  // Chart setup — roda uma vez
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
    tfRef.current          = timeframe;
    targetCloseRef.current = null;
    targetHighRef.current  = null;
    targetLowRef.current   = null;
    animCloseRef.current   = null;
    animHighRef.current    = null;
    animLowRef.current     = null;
    serverBucketRef.current = -1;
    lastBucketRef.current   = -1;
    if (!seriesRef.current) return;
    candlesRef.current.clear();

    api.candles(symbol, timeframe).then((data) => {
      if (!seriesRef.current || !data.length) return;
      const candles: Candle[] = data.map((d) => ({
        time:  d.time as UTCTimestamp,
        open:  d.open,
        high:  d.high,
        low:   d.low,
        close: d.close,
      }));
      candles.forEach((c) => candlesRef.current.set(Number(c.time), c));
      seriesRef.current.setData(candles);
      const last = candles[candles.length - 1];
      // Inicializa estado a partir do último candle do histórico
      serverBucketRef.current = Number(last.time);
      targetCloseRef.current  = last.close;
      targetHighRef.current   = last.high;
      targetLowRef.current    = last.low;
      animCloseRef.current    = last.close;
      animHighRef.current     = last.high;
      animLowRef.current      = last.low;
      chartRef.current?.timeScale().scrollToRealTime();
    });
  }, [symbol, timeframe]);

  // Polling de resiliência — sincroniza últimos 3 candles via REST a cada 5s
  // NÃO sobrescreve o candle atual (em formação), apenas os fechados
  useEffect(() => {
    const sync = async () => {
      if (!seriesRef.current) return;
      const data = await api.candles(symbol, timeframe, 3);
      if (!data.length) return;
      const currentServerBucket = serverBucketRef.current;
      for (const d of data) {
        // Só atualiza candles fechados (anteriores ao bucket atual)
        if (currentServerBucket !== -1 && d.time >= currentServerBucket) continue;
        candlesRef.current.set(d.time, {
          time:  d.time as UTCTimestamp,
          open:  d.open,
          high:  d.high,
          low:   d.low,
          close: d.close,
        });
        // Aplica direto na série para corrigir qualquer divergência em candles fechados
        // (historicalUpdate=true permite atualizar barras já-fechadas, v5+)
        try { seriesRef.current.update({
          time: d.time as UTCTimestamp,
          open: d.open, high: d.high, low: d.low, close: d.close,
        }, true); } catch {}
      }
    };
    const interval = setInterval(sync, 5000);
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  // Loop de animação + feed em tempo real
  useEffect(() => {
    const socket = getSocket();

    // rAF: lerp sincronizado em close + high + low a 60fps.
    // Detecção de mudança de bucket usa o tempo VINDO DO SERVIDOR (serverBucketRef),
    // não Date.now() do cliente. Isso evita skew de relógio + garante que
    // o reset para o open só acontece quando o servidor confirma o novo bucket.
    const loop = () => {
      const tgtClose = targetCloseRef.current;
      const tgtHigh  = targetHighRef.current;
      const tgtLow   = targetLowRef.current;
      const bucket   = serverBucketRef.current;

      if (tgtClose !== null && bucket !== -1 && seriesRef.current) {
        const existing = candlesRef.current.get(bucket);

        if (existing) {
          // ─── TRANSIÇÃO DE BUCKET ──────────────────────────────────────────
          // Quando o servidor anuncia um novo bucket:
          // 1. Finaliza o bucket ANTERIOR com seus valores REAIS (do servidor),
          //    sobrescrevendo qualquer estado lerpado/parcial.
          // 2. Reseta os anim refs para o OPEN do novo bucket (que vira ponto único).
          if (bucket !== lastBucketRef.current) {
            if (lastBucketRef.current !== -1) {
              const oldCandle = candlesRef.current.get(lastBucketRef.current);
              if (oldCandle) {
                try { seriesRef.current.update({
                  time:  oldCandle.time,
                  open:  oldCandle.open,
                  high:  oldCandle.high,
                  low:   oldCandle.low,
                  close: oldCandle.close,
                }); } catch {}
              }
            }
            lastBucketRef.current = bucket;
            animCloseRef.current  = existing.open;
            animHighRef.current   = existing.open;
            animLowRef.current    = existing.open;
          }

          // Inicializa se ainda null (deveria ter sido inicializado antes, defensivo)
          if (animCloseRef.current === null) animCloseRef.current = existing.open;
          if (animHighRef.current  === null) animHighRef.current  = existing.open;
          if (animLowRef.current   === null) animLowRef.current   = existing.open;

          // Lerp do close (bidirecional, 0.05/frame ≈ 1s para 95%)
          const curClose  = animCloseRef.current;
          const diffClose = tgtClose - curClose;
          animCloseRef.current = Math.abs(diffClose) < 0.0000001 ? tgtClose : curClose + diffClose * 0.05;

          // Lerp do high — só cresce (high real só pode aumentar dentro do bucket)
          const curHigh = animHighRef.current;
          const tH = tgtHigh ?? tgtClose;
          if (tH > curHigh) {
            const diffHigh = tH - curHigh;
            animHighRef.current = diffHigh < 0.0000001 ? tH : curHigh + diffHigh * 0.05;
          }

          // Lerp do low — só decresce
          const curLow = animLowRef.current;
          const tL = tgtLow ?? tgtClose;
          if (tL < curLow) {
            const diffLow = tL - curLow;
            animLowRef.current = Math.abs(diffLow) < 0.0000001 ? tL : curLow + diffLow * 0.05;
          }

          // Render do bucket atual com valores lerpados
          const c: Candle = {
            time:  bucket as UTCTimestamp,
            open:  existing.open,
            high:  animHighRef.current!,
            low:   animLowRef.current!,
            close: animCloseRef.current!,
          };
          try { seriesRef.current.update(c); } catch {}
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    const applyServerCandle = (candles: Record<number, ServerCandle>) => {
      const tf     = tfRef.current;
      const candle = candles[tf];
      if (!candle) return;

      // Atualiza candlesRef com valores RAW do servidor
      candlesRef.current.set(candle.time, {
        time:  candle.time as UTCTimestamp,
        open:  candle.open,
        high:  candle.high,
        low:   candle.low,
        close: candle.close,
      });

      // Tempo do bucket atual = informado pelo servidor (não inferido pelo relógio do cliente)
      if (candle.time >= serverBucketRef.current) {
        serverBucketRef.current = candle.time;
      }

      targetCloseRef.current = candle.close;
      targetHighRef.current  = candle.high;
      targetLowRef.current   = candle.low;
    };

    const onUpdate = (msg: {
      symbol: string;
      price: number;
      timestamp?: number;
      candles?: Record<number, ServerCandle>;
    }) => {
      if (!msg || msg.symbol !== symbol) return;
      if (msg.candles) applyServerCandle(msg.candles);
    };

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

      if (candle.time >= serverBucketRef.current) {
        serverBucketRef.current = candle.time;
      }

      targetCloseRef.current = candle.close;
      targetHighRef.current  = candle.high;
      targetLowRef.current   = candle.low;

      if (animCloseRef.current === null) animCloseRef.current = candle.close;
      if (animHighRef.current  === null) animHighRef.current  = candle.high;
      if (animLowRef.current   === null) animLowRef.current   = candle.low;
    };

    const subscribe = () => socket.emit("subscribe:asset", symbol);
    subscribe();
    socket.on("connect",         subscribe);
    socket.on("price_update",    onUpdate);
    socket.on("candle_snapshot", onSnapshot);

    return () => {
      cancelAnimationFrame(rafRef.current);
      socket.off("connect",         subscribe);
      socket.off("price_update",    onUpdate);
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
