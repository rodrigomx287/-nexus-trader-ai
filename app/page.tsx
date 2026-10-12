
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
} from "lightweight-charts";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type Analysis = {
  trend: string;
  signal: string;
  detail: string;
  last?: number;
  resistance?: number;
  support?: number;
};

const SYMBOLS = [
  { label: "ORO · XAU/USD", value: "XAU/USD" },
  { label: "EUR/USD", value: "EUR/USD" },
  { label: "GBP/USD", value: "GBP/USD" },
  { label: "BTC/USD", value: "BTC/USD" },
];

const TIMEFRAMES = [
  { label: "M1", minutes: 1 },
  { label: "M3", minutes: 3 },
  { label: "M4", minutes: 4 },
];

function aggregateCandles(candles: Candle[], minutes: number): Candle[] {
  if (minutes === 1) return candles;

  const groups = new Map<number, Candle>();
  const seconds = minutes * 60;

  for (const candle of candles) {
    const bucket = Math.floor(candle.time / seconds) * seconds;
    const existing = groups.get(bucket);

    if (!existing) {
      groups.set(bucket, { ...candle, time: bucket });
    } else {
      existing.high = Math.max(existing.high, candle.high);
      existing.low = Math.min(existing.low, candle.low);
      existing.close = candle.close;
    }
  }

  return Array.from(groups.values()).sort((a, b) => a.time - b.time);
}

function analyze(candles: Candle[]): Analysis {
  if (candles.length < 25) {
    return {
      trend: "DATOS INSUFICIENTES",
      signal: "ESPERAR",
      detail: "Se necesitan al menos 25 velas válidas.",
    };
  }

  const closes = candles.map((c) => c.close);
  const last = closes[closes.length - 1];

  function ema(period: number): number {
    const k = 2 / (period + 1);
    let value = closes[0];

    for (const price of closes.slice(1)) {
      value = price * k + value * (1 - k);
    }

    return value;
  }

  const fast = ema(9);
  const slow = ema(21);
  const recent = candles.slice(-5);
  const rising = recent[recent.length - 1].close > recent[0].open;
  const falling = recent[recent.length - 1].close < recent[0].open;

  let trend = "LATERAL";
  let signal = "ESPERAR";
  let detail = "No hay confirmación suficiente para una entrada.";

  if (fast > slow && last > fast) {
    trend = "ALCISTA";

    if (rising) {
      signal = "POSIBLE COMPRA";
      detail = "Tendencia alcista e impulso reciente. Espera confirmación.";
    }
  } else if (fast < slow && last < fast) {
    trend = "BAJISTA";

    if (falling) {
      signal = "POSIBLE VENTA";
      detail = "Tendencia bajista e impulso reciente. Espera confirmación.";
    }
  }

  const recentCandles = candles.slice(-20);

  return {
    trend,
    signal,
    detail,
    last,
    resistance: Math.max(...recentCandles.map((c) => c.high)),
    support: Math.min(...recentCandles.map((c) => c.low)),
  };
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  const [symbol, setSymbol] = useState("XAU/USD");
  const [timeframe, setTimeframe] = useState(1);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [refreshCount, setRefreshCount] = useState(30);

  const loadData = useCallback(async () => {
    try {
      setError("");

      const response = await fetch(
        `/api/market?symbol=${encodeURIComponent(symbol)}&interval=1min`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok || !Array.isArray(data.values)) {
        throw new Error(data.error || "No se recibieron datos de mercado.");
      }

      const parsed: Candle[] = data.values
        .map((item: Record<string, string>) => ({
          time: Math.floor(
            new Date(
              item.datetime.includes("T")
                ? item.datetime
                : item.datetime.replace(" ", "T")
            ).getTime() / 1000
          ),
          open: Number(item.open),
          high: Number(item.high),
          low: Number(item.low),
          close: Number(item.close),
        }))
        .filter(
          (c: Candle) =>
            Number.isFinite(c.time) &&
            Number.isFinite(c.open) &&
            Number.isFinite(c.high) &&
            Number.isFinite(c.low) &&
            Number.isFinite(c.close) &&
            c.high >= c.low
        )
        .sort((a: Candle, b: Candle) => a.time - b.time);

      if (!parsed.length) {
        throw new Error("La API no devolvió velas válidas.");
      }

      setCandles(aggregateCandles(parsed, timeframe));
      setUpdatedAt(new Date().toLocaleTimeString());
      setRefreshCount(30);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar los datos."
      );
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    void loadData();

    const timer = window.setInterval(() => {
      void loadData();
    }, 30000);

    return () => window.clearInterval(timer);
  }, [loadData]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#071426" },
        textColor: "#9fb4d0",
      },
      grid: {
        vertLines: { color: "#14253b" },
        horzLines: { color: "#14253b" },
      },
      rightPriceScale: { borderColor: "#203651" },
      timeScale: {
        borderColor: "#203651",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#16c784",
      downColor: "#ea3943",
      borderUpColor: "#16c784",
      borderDownColor: "#ea3943",
      wickUpColor: "#16c784",
      wickDownColor: "#ea3943",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;

    seriesRef.current.setData(
      candles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRefreshCount((n) => (n <= 1 ? 30 : n - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const result = analyze(candles);

  function money(value?: number) {
    if (value === undefined) return "—";

    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 5,
    });
  }

  return (
    <main className="min-h-screen bg-[#050d19] text-white">
      <header className="border-b border-blue-900/60 bg-[#081629] px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold tracking-[0.28em] text-blue-400">
              NEXUS
            </div>
            <h1 className="text-2xl font-black">TRADER AI</h1>
            <p className="mt-1 text-xs text-slate-400">
              Plataforma de análisis de mercado
            </p>
          </div>

          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-right">
            <div className="text-[10px] text-blue-300">ACTUALIZACIÓN</div>
            <div className="text-sm font-bold">{refreshCount}s</div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-4 p-3 sm:p-5">
        <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-800 bg-[#0a1728] p-4">
          <label className="min-w-[180px] flex-1 text-xs text-slate-400">
            ACTIVO
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-slate-700 bg-[#101f33] p-3 text-sm text-white"
            >
              {SYMBOLS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <div className="mb-2 text-xs text-slate-400">TEMPORALIDAD</div>
            <div className="flex gap-2">
              {TIMEFRAMES.map((item) => (
                <button
                  key={item.minutes}
                  onClick={() => setTimeframe(item.minutes)}
                  className={`rounded-lg px-5 py-3 text-sm font-bold ${
                    timeframe === item.minutes
                      ? "bg-blue-600 text-white"
                      : "border border-slate-700 bg-[#101f33] text-slate-300"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => void loadData()}
            className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold"
          >
            ↻ Actualizar
          </button>
        </section>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#071426]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
            <div>
              <h2 className="font-bold">{symbol}</h2>
              <p className="text-xs text-slate-400">
                Velas M{timeframe} · Twelve Data
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400">ÚLTIMO CIERRE</div>
              <div className="text-lg font-bold text-blue-300">
                {candles.length
                  ? money(candles[candles.length - 1].close)
                  : "—"}
              </div>
            </div>
          </div>

          <div ref={containerRef} className="h-[360px] w-full sm:h-[480px]" />

          <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
            {loading
              ? "Cargando datos..."
              : `Última consulta: ${updatedAt || "—"} · ${candles.length} velas`}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold tracking-wider text-blue-300">
            ANÁLISIS TÉCNICO
          </h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-xl border border-slate-800 bg-[#0a1728] p-4">
              <p className="text-xs text-slate-400">TENDENCIA · EMA 9/21</p>
              <p className="mt-2 text-lg font-black">{result.trend}</p>
            </article>

            <article className="rounded-xl border border-slate-800 bg-[#0a1728] p-4">
              <p className="text-xs text-slate-400">SEÑAL ORIENTATIVA</p>
              <p className="mt-2 text-lg font-black text-blue-300">
                {result.signal}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                {result.detail}
              </p>
            </article>

            <article className="rounded-xl border border-slate-800 bg-[#0a1728] p-4">
              <p className="text-xs text-slate-400">RESISTENCIA · 20 VELAS</p>
              <p className="mt-2 text-lg font-bold">
                {money(result.resistance)}
              </p>
            </article>

            <article className="rounded-xl border border-slate-800 bg-[#0a1728] p-4">
              <p className="text-xs text-slate-400">SOPORTE · 20 VELAS</p>
              <p className="mt-2 text-lg font-bold">{money(result.support)}</p>
            </article>
          </div>
        </section>

        <p className="pb-4 text-xs leading-5 text-slate-500">
          Las señales son orientativas, no garantías de resultado. M3 y M4 se
          calculan agrupando velas de un minuto. La actualización consulta la
          API cada 30 segundos, pero el precio solo cambia cuando llegan datos
          nuevos del proveedor. Verifica los precios antes de operar.
        </p>
      </div>
    </main>
  );
}
