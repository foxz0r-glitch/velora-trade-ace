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

function frozenKey(symbol: string, tf: number, bucket: number) {
  return `vc:${symbol}:${tf}:${bucket}`;
}
function saveCandle(symbol: string, tf: number, candle: Candle) {
  try { sessionStorage.setItem(frozenKey(symbol, tf, Number(candle.time)), JSON.stringify(candle)); } catch {}
}
function loadCandle(symbol: string, tf: number, bucket: number): Candle | null {
  try {
    const raw = sessionStorage.getItem(frozenKey(symbol, tf, bucket));
    return raw ? (JSON.parse(raw) as Candle) : null;
  } catch { return null; }
}

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
  // Preço alvo (último tick real ou polling) — animation interpola até ele
  const targetCloseRef = useRef<number | null>(null);
  // Valores atualmente exibidos no gráfico (interpolados)
  const animCloseRef = useRef<number | null>(null);
  const animHighRef  = useRef<number | null>(null);
  const animLowRef   = useRef<number | null>(null);
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
    animHighRef.current = null;
    animLowRef.current = null;
    lastBucketRef.current = -1;
    if (!seriesRef.current) return;
    candlesRef.current.clear();
    lastPriceRef.current = null;

    api.candles(symbol, timeframe).then((data) => {
      if (!seriesRef.current) return;
      const candles: Candle[] = data.map((d) => {
        const frozen = loadCandle(symbol, timeframe, d.time);
        if (frozen) return frozen;
        return {
          time: d.time as UTCTimestamp,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        };
      });
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

  // Polling das últimas 3 candles da CasaTrade a cada 1s
  // Só atualiza candlesRef para o candle ATUAL — candles fechados não são tocados
  useEffect(() => {
    const sync = async () => {
      if (!seriesRef.current) return;
      const data = await api.candles(symbol, timeframe, 3);
      if (!data.length) return;
      const nowSec = Math.floor(Date.now() / 1000);
      const currentBucket = nowSec - (nowSec % timeframe);
      for (const d of data) {
        // Ignora candles já fechados — preserva os valores finalizados na troca de bucket
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
      const last = data[data.length - 1];
      targetCloseRef.current = last.close;
      lastPriceRef.current = last.close;
    };
    const interval = setInterval(sync, 1000);
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  // Loop de animação + feed de preços em tempo real
  useEffect(() => {
    const socket = getSocket();
    let lastRealTickAt = 0;

    // requestAnimationFrame: interpola o close quadro a quadro (60fps) em direção ao alvo
    // Fator 0.05 → cobre ~95% da distância em 1s — movimento fluído como "barra de progresso"
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
          // Troca de bucket: congela candle anterior com valores da animação (não da CasaTrade)
          if (bucket !== lastBucketRef.current) {
            if (lastBucketRef.current !== -1) {
              const prev = candlesRef.current.get(lastBucketRef.current);
              if (
                prev &&
                animCloseRef.current !== null &&
                animHighRef.current !== null &&
                animLowRef.current !== null
              ) {
                const frozen: Candle = {
                  time:  prev.time,
                  open:  prev.open,
                  high:  animHighRef.current,
                  low:   animLowRef.current,
                  close: animCloseRef.current,
                };
                saveCandle(symbol, tfRef.current, frozen);
                try { seriesRef.current.update(frozen); } catch {}
              }
            }
            lastBucketRef.current = bucket;
            animCloseRef.current  = existing.open;
            animHighRef.current   = existing.open;
            animLowRef.current    = existing.open;
          }
          if (animHighRef.current === null) animHighRef.current = next;
          if (animLowRef.current  === null) animLowRef.current  = next;

          // Sombras só crescem onde o corpo animado já esteve — sem puxar pelo polling
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

    // Socket tick: só atualiza o preço alvo (animação cuida do resto)
    const applyPrice = (price: number, ts?: number) => {
      const tf = tfRef.current;
      const t = Math.floor((ts ?? Date.now()) / 1000);
      const bucket = t - (t % tf);
      // Só aceita ticks de candles já existentes (criados pelo polling com open correto)
      if (!candlesRef.current.has(bucket)) {
        lastPriceRef.current = price;
        targetCloseRef.current = price;
        return;
      }
      targetCloseRef.current = price;
      lastPriceRef.current = price;
    };

    const onUpdate = (msg: { symbol: string; price: number; timestamp?: number }) => {
      if (!msg || msg.symbol !== symbol) return;
      lastRealTickAt = Date.now();
      applyPrice(msg.price, msg.timestamp);
    };

    const subscribe = () => socket.emit("subscribe:asset", symbol);
    subscribe();
    socket.on("connect", subscribe);
    socket.on("price_update", onUpdate);

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
