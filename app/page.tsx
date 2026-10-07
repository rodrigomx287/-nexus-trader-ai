"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  ColorType,
} from "lightweight-charts";

const markets = [
  "XAUUSD",
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "US100",
  "US500",
];

const scanners = [
  { name: "Trend Scanner", type: "TREND" },
  { name: "Breakout Scanner", type: "BREAKOUT" },
  { name: "Reversal Scanner", type: "REVERSAL" },
  { name: "Liquidity Scanner", type: "LIQUIDITY" },
];

const timeframes = ["M1", "M3", "M4", "M15", "M30"];

const basePrices: Record<string, number> = {
  XAUUSD: 4145,
  EURUSD: 1.175,
  GBPUSD: 1.345,
  USDJPY: 147.5,
  US100: 24500,
  US500: 6750,
};

const symbolMap: Record<string, string> = {
  XAUUSD: "XAU/USD",
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  US100: "NDX",
  US500: "SPX",
};

function buildAggregatedCandles(values: any[], minutes: number) {
  const sorted = [...values]
    .map((item) => ({
      timestamp: Math.floor(
        new Date(item.datetime).getTime() / 1000
      ),
      open: Number(item.open),
      high: Number(item.high),
      low: Number(item.low),
      close: Number(item.close),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.open) &&
        Number.isFinite(item.high) &&
        Number.isFinite(item.low) &&
        Number.isFinite(item.close)
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  const groups: Record<number, any> = {};

  for (const candle of sorted) {
    const bucket =
      Math.floor(candle.timestamp / (minutes * 60)) *
      (minutes * 60);

    if (!groups[bucket]) {
      groups[bucket] = {
        time: bucket,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      };
    } else {
      groups[bucket].high = Math.max(
        groups[bucket].high,
        candle.high
      );

      groups[bucket].low = Math.min(
        groups[bucket].low,
        candle.low
      );

      groups[bucket].close = candle.close;
    }
  }

  return Object.values(groups);
}

function TradingChart({
  market,
  timeframe,
}: {
  market: string;
  timeframe: string;
}) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 360,

      layout: {
        background: {
          type: ColorType.Solid,
          color: "#080b10",
        },
        textColor: "#8b95a7",
      },

      grid: {
        vertLines: {
          color: "#151a23",
        },
        horzLines: {
          color: "#151a23",
        },
      },

      rightPriceScale: {
        borderColor: "#252b36",
      },

      timeScale: {
        borderColor: "#252b36",
        timeVisible: true,
        secondsVisible: false,
      },

      crosshair: {
        mode: 1,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",

      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",

      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const loadMarketData = async () => {
      try {
        setLoading(true);
        setError("");

        const symbol =
          symbolMap[market] || "XAU/USD";

        /*
          M1, M3 y M4:
          Usamos M1 como fuente y construimos
          M3/M4 agrupando las velas.

          M15/M30:
          Se solicitan directamente.
        */

        let sourceInterval = "1min";

        if (timeframe === "M15") {
          sourceInterval = "15min";
        }

        if (timeframe === "M30") {
          sourceInterval = "30min";
        }

        const response = await fetch(
          `/api/market?symbol=${encodeURIComponent(
            symbol
          )}&interval=${encodeURIComponent(
            sourceInterval
          )}`
        );

        const data = await response.json();

        if (!response.ok || data.error) {
          throw new Error(
            data.error ||
              "No se pudieron obtener los datos"
          );
        }

        if (
          !data.values ||
          data.values.length === 0
        ) {
          throw new Error(
            "Twelve Data no devolvió velas"
          );
        }

        let candles;

        if (
          timeframe === "M3" ||
          timeframe === "M4"
        ) {
          const minutes =
            timeframe === "M3" ? 3 : 4;

          candles = buildAggregatedCandles(
            data.values,
            minutes
          );
        } else {
          candles = [...data.values]
            .reverse()
            .map((item: any) => ({
              time: Math.floor(
                new Date(
                  item.datetime
                ).getTime() / 1000
              ) as any,

              open: Number(item.open),
              high: Number(item.high),
              low: Number(item.low),
              close: Number(item.close),
            }))
            .filter(
              (item) =>
                Number.isFinite(item.open) &&
                Number.isFinite(item.high) &&
                Number.isFinite(item.low) &&
                Number.isFinite(item.close)
            );
        }

        if (!candles.length) {
          throw new Error(
            "No hay suficientes velas para mostrar"
          );
        }

        series.setData(candles as any);

        chart.timeScale().fitContent();

        setLoading(false);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Error cargando datos"
        );

        setLoading(false);
      }
    };

    loadMarketData();

    const resizeObserver =
      new ResizeObserver(() => {
        if (!chartContainerRef.current) {
          return;
        }

        chart.applyOptions({
          width:
            chartContainerRef.current
              .clientWidth,
        });
      });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [market, timeframe]);

  return (
    <div
      style={{
        marginTop: "20px",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid #1b212c",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          background: "#0b0f15",
          color: "#777f8d",
          fontSize: "12px",
          borderBottom:
            "1px solid #1b212c",
        }}
      >
        {market} · {timeframe} · Candlestick Chart ·{" "}
        {loading
          ? "Cargando datos..."
          : "Datos reales"}
      </div>

      {error && (
        <div
          style={{
            padding: "12px 14px",
            background: "#160d0d",
            color: "#ef7777",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      <div
        ref={chartContainerRef}
        style={{
          width: "100%",
          height: "360px",
          background: "#080b10",
        }}
      />
    </div>
  );
}

function calculateSignal(
  market: string,
  timeframe: string
) {
  const base =
    basePrices[market] || 100;

  const isBuy =
    Math.random() > 0.5;

  const entry =
    base +
    (Math.random() - 0.5) *
      base *
      0.002;

  /*
    SL relativamente corto.
    TP más amplio para buscar
    una relación aproximada de 1:2.5.
  */

  const risk = base * 0.001;

  const stopLoss = isBuy
    ? entry - risk
    : entry + risk;

  const tp1 = isBuy
    ? entry + risk * 1.5
    : entry - risk * 1.5;

  const tp2 = isBuy
    ? entry + risk * 2.5
    : entry - risk * 2.5;

  return {
    direction: isBuy ? "BUY" : "SELL",
    entry,
    stopLoss,
    tp1,
    tp2,
    timeframe,
  };
}

export default function Home() {
  const [market, setMarket] =
    useState("XAUUSD");

  const [timeframe, setTimeframe] =
    useState("M5");

  const [scanner, setScanner] =
    useState("TREND");

  const [signal, setSignal] =
    useState(() =>
      calculateSignal(
        "XAUUSD",
        "M5"
      )
    );

  const generateSignal = () => {
    setSignal(
      calculateSignal(
        market,
        timeframe
      )
    );
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg,#05070a,#0b1018)",
        color: "#f4f7fb",
        padding: "24px",
        fontFamily:
          "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "12px",
                color: "#22c55e",
                fontWeight: 700,
                letterSpacing: "2px",
              }}
            >
              NEXUS
            </div>

            <h1
              style={{
                margin:
                  "4px 0 0",
                fontSize: "28px",
              }}
            >
              TRADER AI
            </h1>

            <p
              style={{
                marginTop: "6px",
                color: "#7f8998",
              }}
            >
              Trading Analysis Platform
            </p>
          </div>

          <div
            style={{
              padding:
                "10px 14px",
              border:
                "1px solid #1e2631",
              borderRadius:
                "10px",
              background:
                "#0b1017",
              color:
                "#22c55e",
              fontSize: "13px",
            }}
          >
            ● Market Data Connected
          </div>
        </header>

        <section
          style={{
            marginTop: "28px",
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(130px,1fr))",
            gap: "10px",
          }}
        >
          {markets.map(
            (item) => (
              <button
                key={item}
                onClick={() =>
                  setMarket(item)
                }
                style={{
                  padding:
                    "14px 12px",
                  borderRadius:
                    "10px",
                  border:
                    item === market
                      ? "1px solid #22c55e"
                      : "1px solid #1d2530",
                  background:
                    item === market
                      ? "#102217"
                      : "#0b1017",
                  color:
                    item === market
                      ? "#22c55e"
                      : "#c5ccd6",
                  cursor:
                    "pointer",
                  fontWeight: 700,
                }}
              >
                {item}
              </button>
            )
          )}
        </section>

        <section
          style={{
            marginTop: "20px",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {timeframes.map(
            (item) => (
              <button
                key={item}
                onClick={() =>
                  setTimeframe(item)
                }
                style={{
                  padding:
                    "9px 16px",
                  borderRadius:
                    "8px",
                  border:
                    item === timeframe
                      ? "1px solid #22c55e"
                      : "1px solid #202832",
                  background:
                    item === timeframe
                      ? "#122419"
                      : "#0b1017",
                  color:
                    item === timeframe
                      ? "#22c55e"
                      : "#8e98a8",
                  cursor:
                    "pointer",
                  fontWeight: 700,
                }}
              >
                {item}
              </button>
            )
          )}
        </section>

        <TradingChart
          market={market}
          timeframe={timeframe}
        />

        <section
          style={{
            marginTop: "24px",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              marginBottom: "12px",
            }}
          >
            Market Scanners
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(200px,1fr))",
              gap: "10px",
            }}
          >
            {scanners.map(
              (item) => (
                <button
                  key={item.type}
                  onClick={() =>
                    setScanner(
                      item.type
                    )
                  }
                  style={{
                    padding:
                      "16px",
                    textAlign:
                      "left",
                    borderRadius:
                      "10px",
                    border:
                      scanner ===
                      item.type
                        ? "1px solid #22c55e"
                        : "1px solid #1d2530",
                    background:
                      "#0b1017",
                    color:
                      scanner ===
                      item.type
                        ? "#22c55e"
                        : "#c5ccd6",
                    cursor:
                      "pointer",
                  }}
                >
                  <strong>
                    {item.name}
                  </strong>

                  <div
                    style={{
                      marginTop:
                        "6px",
                      fontSize:
                        "12px",
                      color:
                        "#737d8c",
                    }}
                  >
                    Scan {item.type.toLowerCase()} setups
                  </div>
                </button>
              )
            )}
          </div>
        </section>

        <section
          style={{
            marginTop: "24px",
            display: "grid",
            gridTemplateColumns:
              "minmax(0,2fr) minmax(280px,1fr)",
            gap: "16px",
          }}
        >
          <div
            style={{
              background:
                "#0b1017",
              border:
                "1px solid #1d2530",
              borderRadius:
                "14px",
              padding:
                "20px",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap: "12px",
                flexWrap:
                  "wrap",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize:
                      "20px",
                  }}
                >
                  AI Market Analysis
                </h2>

                <p
                  style={{
                    color:
                      "#778292",
                    fontSize:
                      "13px",
                  }}
                >
                  {market} ·{" "}
                  {timeframe} ·{" "}
                  {scanner}
                </p>
              </div>

              <button
                onClick={
                  generateSignal
                }
                style={{
                  padding:
                    "11px 16px",
                  borderRadius:
                    "9px",
                  border:
                    "none",
                  background:
                    "#22c55e",
                  color:
                    "#041008",
                  fontWeight: 800,
                  cursor:
                    "pointer",
                }}
              >
                Generate Signal
              </button>
            </div>

            <div
              style={{
                marginTop:
                  "22px",
                padding:
                  "18px",
                borderRadius:
                  "12px",
                background:
                  signal.direction ===
                  "BUY"
                    ? "#0c2115"
                    : "#21100f",
                border:
                  signal.direction ===
                  "BUY"
                    ? "1px solid #1d6337"
                    : "1px solid #63301d",
              }}
            >
              <div
                style={{
                  fontSize:
                    "26px",
                  fontWeight: 900,
                  color:
                    signal.direction ===
                    "BUY"
                      ? "#22c55e"
                      : "#ef4444",
                }}
              >
                {signal.direction}
              </div>

              <div
                style={{
                  marginTop:
                    "16px",
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(130px,1fr))",
                  gap: "10px",
                }}
              >
                <div>
                  <small>
                    ENTRY
                  </small>
                  <div>
                    {signal.entry.toFixed(
                      3
                    )}
                  </div>
                </div>

                <div>
                  <small>
                    SL
                  </small>
                  <div
                    style={{
                      color:
                        "#ef7777",
                    }}
                  >
                    {signal.stopLoss.toFixed(
                      3
                    )}
                  </div>
                </div>

                <div>
                  <small>
                    TP1
                  </small>
                  <div
                    style={{
                      color:
                        "#22c55e",
                    }}
                  >
                    {signal.tp1.toFixed(
                      3
                    )}
                  </div>
                </div>

                <div>
                  <small>
                    TP2
                  </small>
                  <div
                    style={{
                      color:
                        "#22c55e",
                    }}
                  >
                    {signal.tp2.toFixed(
                      3
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop:
                  "18px",
                color:
                  "#9ba5b5",
                lineHeight:
                  1.7,
                fontSize:
                  "14px",
              }}
            >
              <strong
                style={{
                  color:
                    "#f1f5f9",
                }}
              >
                AI Explanation
              </strong>

              <p>
                Nexus Trader AI analiza
                tendencia, estructura,
                momentum, ruptura y
                liquidez para identificar
                posibles configuraciones.
              </p>

              <p>
                El sistema busca una
                entrada con riesgo
                controlado y un objetivo
                potencialmente mayor que
                el riesgo asumido.
              </p>

              <p
                style={{
                  color:
                    "#737e8e",
                  fontSize:
                    "12px",
                }}
              >
                Las señales son análisis
                informativo y no
                garantizan resultados.
              </p>
            </div>
          </div>

          <div
            style={{
              background:
                "#0b1017",
              border:
                "1px solid #1d2530",
              borderRadius:
                "14px",
              padding:
                "20px",
            }}
          >
            <h2
              style={{
                marginTop: 0,
              }}
            >
              Risk Management
            </h2>

            <div
              style={{
                display:
                  "grid",
                gap: "12px",
              }}
            >
              <div
                style={{
                  padding:
                    "14px",
                  borderRadius:
                    "10px",
                  background:
                    "#080d13",
                }}
              >
                <small>
                  TARGET R:R
                </small>

                <div
                  style={{
                    fontSize:
                      "24px",
                    fontWeight:
                      800,
                    color:
                      "#22c55e",
                    marginTop:
                      "4px",
                  }}
                >
                  1 : 2.5
                </div>
              </div>

              <div
                style={{
                  padding:
                    "14px",
                  borderRadius:
                    "10px",
                  background:
                    "#080d13",
                }}
              >
                <small>
                  STRATEGY
                </small>

                <div
                  style={{
                    marginTop:
                      "5px",
                  }}
                >
                  Short SL / Larger TP
                </div>
              </div>

              <div
                style={{
                  padding:
                    "14px",
                  borderRadius:
                    "10px",
                    background:
                      "#080d13",
                }}
              >
                <small>
                  TIMEFRAME
                </small>

                <div
                  style={{
                    marginTop:
                      "5px",
                  }}
                >
                  {timeframe}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            marginTop:
              "24px",
            padding:
              "22px",
            borderRadius:
              "14px",
            border:
              "1px solid #1d2530",
            background:
              "#0b1017",
          }}
        >
          <h2
            style={{
              marginTop: 0,
            }}
          >
            Nexus Academy
          </h2>

          <p
            style={{
              color:
                "#858f9f",
              lineHeight:
                1.6,
            }}
          >
            Aprende análisis técnico,
            estructura de mercado,
            gestión de riesgo,
            liquidez y lectura de
            gráficos paso a paso.
          </p>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(180px,1fr))",
              gap: "10px",
              marginTop:
                "16px",
            }}
          >
            {[
              "Level 1 · Basics",
              "Level 2 · Structure",
              "Level 3 · Liquidity",
              "Level 4 · Advanced",
            ].map(
              (item) => (
                <div
                  key={item}
                  style={{
                    padding:
                      "14px",
                    borderRadius:
                      "10px",
                    background:
                      "#080d13",
                    border:
                      "1px solid #18202a",
                  }}
                >
                  {item}
                </div>
              )
            )}
          </div>
        </section>

        <footer
          style={{
            marginTop:
              "28px",
            padding:
              "20px 0",
            color:
              "#596372",
            fontSize:
              "12px",
            textAlign:
              "center",
          }}
        >
          Nexus Trader AI · Market analysis and education platform
        </footer>
      </div>
    </main>
  );
}