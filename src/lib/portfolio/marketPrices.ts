/**
 * Market price service layer.
 *
 * Prices come from a free, open endpoint (Yahoo Finance) via a server function,
 * so no API key or account is needed. An optional `VITE_MARKET_API_URL` still
 * takes priority if you point it at your own provider.
 */
import type { Investment } from "./types";
import { getQuotes } from "./quotes.functions";

export type Quote = { symbol: string; price: number };

export type PriceResult = {
  prices: Record<string, number>;
  error?: string;
};

async function fetchFromCustomEndpoint(
  endpoint: string,
  symbols: string[],
): Promise<Record<string, number>> {
  const res = await fetch(`${endpoint}?symbols=${encodeURIComponent(symbols.join(","))}`);
  if (!res.ok) throw new Error(`Market API responded ${res.status}`);
  const json = (await res.json()) as Quote[];
  if (!Array.isArray(json)) throw new Error("Invalid market data response");
  const prices: Record<string, number> = {};
  for (const q of json) {
    if (q && typeof q.symbol === "string" && Number.isFinite(q.price)) {
      prices[q.symbol.toUpperCase()] = q.price;
    }
  }
  return prices;
}


/** Returns fresh prices where possible; callers fall back to last saved price. */
export async function refreshPrices(investments: Investment[]): Promise<PriceResult> {
  const symbols = investments
    .filter((i) => (i.type === "Stock" || i.type === "ETF") && i.symbol)
    .flatMap((i) => {
      const symbol = i.symbol?.trim().toUpperCase();
      return symbol ? [symbol] : [];
    });

  if (symbols.length === 0) {
    return { prices: {}, error: "No stock or ETF symbols to refresh" };
  }

  const endpoint = import.meta.env["VITE_MARKET_API_URL"] as string | undefined;

  try {
    if (endpoint) {
      const prices = await fetchFromCustomEndpoint(endpoint, symbols);
      if (Object.keys(prices).length > 0) return { prices };
    }
    return await getQuotes({ data: { symbols } });
  } catch (e) {
    return {
      prices: {},
      error: e instanceof Error ? e.message : "Unable to reach market data provider",
    };
  }

}
