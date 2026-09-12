import { KNOWN_INDIAN_INSTRUMENTS } from "./indianInstruments";

/**
 * Free symbol/scheme search for Indian stocks, ETFs and mutual funds.
 *
 * Stocks/ETFs: public Yahoo Finance search endpoint (no key).
 * Mutual funds: public AMFI-backed MFAPI scheme list (no key).
 */

export type SearchHit = {
  name: string;
  symbol?: string;
  type: "Stock" | "ETF" | "Mutual Fund";
  exchange?: string;
  price?: number;
};

type YahooSearch = {
  quotes?: Array<{
    symbol?: string;
    shortname?: string;
    longname?: string;
    quoteType?: string;
    exchange?: string;
    exchDisp?: string;
  }>;
};

type MfHit = { schemeCode: number; schemeName: string };

async function yahooSearch(query: string): Promise<SearchHit[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    query,
  )}&quotesCount=12&newsCount=0`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as YahooSearch;
  const hits: SearchHit[] = [];
  for (const q of json.quotes ?? []) {
    const sym = q.symbol ?? "";
    if (!sym) continue;
    const indian = /\.(NS|BO)$/.test(sym);
    if (!indian) continue;
    const quoteType = (q.quoteType ?? "").toUpperCase();
    hits.push({
      name: q.longname ?? q.shortname ?? sym,
      symbol: sym.replace(/\.(NS|BO)$/, ""),
      type: quoteType === "ETF" ? "ETF" : "Stock",
      exchange: q.exchDisp ?? q.exchange ?? (sym.endsWith(".NS") ? "NSE" : "BSE"),
    });
  }
  return hits;
}

async function mfSearch(query: string): Promise<SearchHit[]> {
  const res = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as MfHit[];
  if (!Array.isArray(json)) return [];
  return json.slice(0, 10).map((m) => ({
    name: m.schemeName,
    type: "Mutual Fund" as const,
    exchange: "AMFI",
  }));
}

export async function searchInstruments(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const normalized = q.toLowerCase();
  const local = KNOWN_INDIAN_INSTRUMENTS.filter(
    (instrument) =>
      instrument.name.toLowerCase().includes(normalized) ||
      instrument.symbol.toLowerCase().includes(normalized),
  );
  const [stocks, funds] = await Promise.all([
    yahooSearch(q).catch(() => [] as SearchHit[]),
    mfSearch(q).catch(() => [] as SearchHit[]),
  ]);
  const seen = new Set<string>();
  // Prefer the NSE listing when the same symbol is listed on both NSE and BSE.
  const nseFirst = [...stocks].sort((a, b) => {
    const rank = (h: SearchHit) => (h.exchange === "NSE" || h.exchange === "NSI" ? 0 : 1);
    return rank(a) - rank(b);
  });
  return [...local, ...nseFirst, ...funds]
    .filter((h) => {
      const key = `${h.type}:${h.symbol ?? h.name}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 15);
}
