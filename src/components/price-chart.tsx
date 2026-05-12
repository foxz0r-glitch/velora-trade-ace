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
  const chartRef     = useRef<IChartApi | null>(null);
  const seriesRef    = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const tfRef        = useRef<number>(60);

  // Candle atual em construção (cliente faz a única agregação que sobrou:
  // pegar o tick e atualizar close/high/low do bucket vigente).
  const currentRef = useRef<Candle | null>(null);

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
    };
  }, []);

  // Carrega histórico ao mudar símbolo ou timeframe — vem direto da CasaTrade
  useEffect(() => {
    tfRef.current = timeframe;
    currentRef.current = null;
    if (!seriesRef.current) return;

    api.candles(symbol, timeframe).then((data) => {
      if (!seriesRef.current || !data.length) return;
      const candles: Candle[] = data.map((d) => ({
        time:  d.time as UTCTimestamp,
        open:  d.open,
        high:  d.high,
        low:   d.low,
        close: d.close,
      }));
      seriesRef.current.setData(candles);
      // O último candle do histórico vira o "atual" — próximos ticks atualizam ele
      currentRef.current = candles[candles.length - 1];
      chartRef.current?.timeScale().scrollToRealTime();
    });
  }, [symbol, timeframe]);

  // Polling de resiliência — recarrega últimos candles da CasaTrade a cada 5s
  // para corrigir qualquer drift do candle local
  useEffect(() => {
    const sync = async () => {
      if (!seriesRef.current) return;
      const data = await api.candles(symbol, timeframe, 5);
      if (!data.length) return;
      for (const d of data) {
        try {
          seriesRef.current.update(
            {
              time:  d.time as UTCTimestamp,
              open:  d.open,
              high:  d.high,
              low:   d.low,
              close: d.close,
            },
            true
          );
        } catch {}
      }
      // Atualiza o candle atual de referência
      const last = data[data.length - 1];
      const nowSec = Math.floor(Date.now() / 1000);
      const currentBucket = nowSec - (nowSec % timeframe);
      if (last.time === currentBucket) {
        currentRef.current = {
          time:  last.time as UTCTimestamp,
          open:  last.open,
          high:  last.high,
          low:   last.low,
          close: last.close,
        };
      }
    };
    const interval = setInterval(sync, 5000);
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  // Feed de ticks em tempo real — apenas `{symbol, price, timestamp}` chega do servidor.
  // Cliente determina o bucket e atualiza close/high/low. Quando o bucket muda,
  // abre um novo candle automaticamente.
  useEffect(() => {
    const socket = getSocket();

    const onTick = (msg: { symbol: string; price: number; timestamp: number }) => {
      if (!msg || msg.symbol !== symbol || !seriesRef.current) return;

      const tf      = tfRef.current;
      const tsSec   = Math.floor(msg.timestamp / 1000);
      const bucket  = tsSec - (tsSec % tf);
      const current = currentRef.current;

      if (!current || current.time !== bucket) {
        // Novo bucket — abre candle com open=high=low=close=price
        const fresh: Candle = {
          time:  bucket as UTCTimestamp,
          open:  msg.price,
          high:  msg.price,
          low:   msg.price,
          close: msg.price,
        };
        currentRef.current = fresh;
        try { seriesRef.current.update(fresh); } catch {}
      } else {
        // Mesmo bucket — atualiza high/low/close
        current.close = msg.price;
        if (msg.price > current.high) current.high = msg.price;
        if (msg.price < current.low)  current.low  = msg.price;
        try { seriesRef.current.update(current); } catch {}
      }
    };

    const subscribe = () => socket.emit("subscribe:asset", symbol);
    subscribe();
    socket.on("connect",      subscribe);
    socket.on("price_update", onTick);

    return () => {
      socket.off("connect",      subscribe);
      socket.off("price_update", onTick);
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
