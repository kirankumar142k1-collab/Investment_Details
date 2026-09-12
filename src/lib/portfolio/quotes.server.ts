/**
 * Free/open market data lookup for Indian listed symbols.
 *
 * Uses the public Yahoo Finance chart endpoint (no API key, no account).
 * NSE is tried first (`SYMBOL.NS`), then BSE (`SYMBOL.BO`) as a fallback.
 * Requests are made sequentially with a small retry, because the public
 * endpoint rate-limits bursts with HTTP 429.
 */

type ChartResponse = {
  chart?: {
    result?: Array<{ meta?: { regularMarketPrice?: number } }>;
  };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function priceFor(yahooSymbol: string): Promise<number | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSymbol,
  )}?interval=1d&range=1d`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    });
    if (res.status === 429) {
      await sleep(400 * (attempt + 1));
      continue;
    }
    if (!res.ok) return null;
    const json = (await res.json()) as ChartResponse;
    const price = json.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === "number" && Number.isFinite(price) && price > 0 ? price : null;
  }
  return null;
}

/** Resolves each raw symbol to a live price, trying NSE then BSE. */
export async function lookupQuotes(symbols: string[]): Promise<Record<string, number>> {
  const unique = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
  const out: Record<string, number> = {};

  for (const raw of unique) {
    const candidates = /\.(NS|BO)$/.test(raw) ? [raw] : [`${raw}.NS`, `${raw}.BO`];
    for (const candidate of candidates) {
      try {
        const price = await priceFor(candidate);
        if (price !== null) {
          out[raw] = price;
          break;
        }
      } catch (e) {
        console.error("[quotes] lookup failed for", candidate, e);
      }
    }
  }

  return out;
}
