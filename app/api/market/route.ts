import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const symbol = searchParams.get("symbol") || "XAU/USD";
  const interval = searchParams.get("interval") || "5min";

  const apiKey = process.env.TWELVE_DATA_API_KEY?.trim();

  // Diagnóstico seguro: nunca muestra la API Key.
  console.log("TWELVE_DATA_API_KEY existe:", Boolean(apiKey));
  console.log("TWELVE_DATA_API_KEY longitud:", apiKey?.length || 0);

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Twelve Data API key no configurada en el entorno de producción.",
      },
      { status: 500 }
    );
  }

  const url = new URL("https://api.twelvedata.com/time_series");

  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("outputsize", "100");
  url.searchParams.set("apikey", apiKey);

  try {
    const response = await fetch(url.toString(), {
      cache: "no-store",
    });

    const data = await response.json();

    console.log("Twelve Data HTTP:", response.status);
    console.log("Twelve Data status:", data?.status || "sin status");

    if (!response.ok || data?.status === "error") {
      return NextResponse.json(
        {
          error:
            data?.message ||
            "Twelve Data rechazó la solicitud.",
        },
        { status: 400 }
      );
    }

    if (!data?.values || !Array.isArray(data.values)) {
      return NextResponse.json(
        {
          error: "Twelve Data no devolvió datos de mercado.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error conectando con Twelve Data:", error);

    return NextResponse.json(
      {
        error: "No se pudo conectar con Twelve Data.",
      },
      { status: 500 }
    );
  }
}