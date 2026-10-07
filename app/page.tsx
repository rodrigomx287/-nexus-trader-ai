"use client";

import { useState } from "react";

const markets = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "US100", "US500"];

const scanners = [
  { name: "Trend Scanner", type: "TREND" },
  { name: "Breakout Scanner", type: "BREAKOUT" },
  { name: "Reversal Scanner", type: "REVERSAL" },
  { name: "Liquidity Scanner", type: "LIQUIDITY" },
];

export default function Home() {
  const [market, setMarket] = useState("XAUUSD");
  const [timeframe, setTimeframe] = useState("M5");
  const [scanner, setScanner] = useState("TREND");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#07090d",
        color: "white",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "13px", color: "#777" }}>
          NEXUS TRADER AI
        </div>

        <h1 style={{ margin: "6px 0", fontSize: "30px" }}>
          Trading Analysis Dashboard
        </h1>

        <p style={{ color: "#888" }}>
          Análisis inteligente del mercado en tiempo real.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "10px",
          marginBottom: "24px",
        }}
      >
        {markets.map((item) => (
          <button
            key={item}
            onClick={() => setMarket(item)}
            style={{
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #222",
              background: market === item ? "#151b25" : "#0d1016",
              color: "white",
            }}
          >
            {item}
          </button>
        ))}
      </section>

      <section
        style={{
          background: "#0d1016",
          border: "1px solid #20242d",
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ color: "#888", fontSize: "13px" }}>
              Instrument
            </div>

            <h2 style={{ margin: "5px 0" }}>{market}</h2>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {["M5", "M15", "H1"].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  padding: "9px 14px",
                  borderRadius: "8px",
                  border: "1px solid #292e38",
                  background: timeframe === tf ? "#1d2635" : "#0a0d12",
                  color: "white",
                }}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            height: "260px",
            marginTop: "20px",
            borderRadius: "12px",
            background:
              "linear-gradient(135deg, #101722, #080b10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#59616f",
          }}
        >
          {market} · {timeframe} · Chart
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: "14px" }}>Scanners</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
          }}
        >
          {scanners.map((item) => (
            <button
              key={item.type}
              onClick={() => setScanner(item.type)}
              style={{
                textAlign: "left",
                padding: "18px",
                borderRadius: "12px",
                border: "1px solid #222",
                background:
                  scanner === item.type ? "#151b25" : "#0d1016",
                color: "white",
              }}
            >
              <strong>{item.name}</strong>

              <div
                style={{
                  marginTop: "8px",
                  color: "#777",
                  fontSize: "13px",
                }}
              >
                Detectar setups de {item.type.toLowerCase()}.
              </div>
            </button>
          ))}
        </div>
      </section>

      <section
        style={{
          marginTop: "24px",
          padding: "20px",
          borderRadius: "16px",
          border: "1px solid #20242d",
          background: "#0d1016",
        }}
      >
        <div style={{ color: "#888", fontSize: "13px" }}>
          AI ANALYSIS
        </div>

        <h2 style={{ margin: "7px 0" }}>
          {market} · {scanner}
        </h2>

        <p style={{ color: "#aaa", lineHeight: 1.6 }}>
          Nexus Trader AI analiza la estructura del mercado,
          tendencia, rupturas, reversión y liquidez para encontrar
          posibles oportunidades.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "10px",
            marginTop: "16px",
          }}
        >
          <div style={{ padding: "14px", background: "#11151d", borderRadius: "10px" }}>
            <small>Signal</small>
            <div style={{ marginTop: "5px", fontWeight: "bold" }}>BUY</div>
          </div>

          <div style={{ padding: "14px", background: "#11151d", borderRadius: "10px" }}>
            <small>Stop Loss</small>
            <div style={{ marginTop: "5px", fontWeight: "bold" }}>4138.262</div>
          </div>

          <div style={{ padding: "14px", background: "#11151d", borderRadius: "10px" }}>
            <small>TP1</small>
            <div style={{ marginTop: "5px", fontWeight: "bold" }}>4157.951</div>
          </div>

          <div style={{ padding: "14px", background: "#11151d", borderRadius: "10px" }}>
            <small>TP2</small>
            <div style={{ marginTop: "5px", fontWeight: "bold" }}>4171.077</div>
          </div>
        </div>
      </section>
    </main>
  );
}