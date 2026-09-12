import type { Investment, PortfolioData } from "./types";
import { sampleData } from "./sampleData";

const KEY = "portfolio-data-v1";
const SAMPLE_VERSION_KEY = "portfolio-sample-version";
const SAMPLE_VERSION = "4";

const TATA_COMMERCIAL_NAME = "Tata Motors Commercial Vehicles Limited";
const TATA_PASSENGER_NAME = "Tata Motors Passenger Vehicles Limited";
const LEGACY_TMPV_NOTE = "No separate listed symbol; update the current price manually.";

function dropLegacyNote(investment: Investment): Investment {
  if (investment.notes !== LEGACY_TMPV_NOTE) return investment;
  const { notes: _notes, ...rest } = investment;
  return rest as Investment;
}

function normalizeSymbol(investment: Investment): Investment {
  const cleaned = dropLegacyNote(investment);
  const raw = (cleaned.symbol ?? "").trim().toUpperCase();
  const name = cleaned.name.trim().toLowerCase();

  if (raw === "TMPV" || name.includes("passenger vehicles")) {
    return { ...cleaned, name: TATA_PASSENGER_NAME, symbol: "TMPV" };
  }

  if (
    raw === "TMCV" ||
    raw === "TATAMOTORS" ||
    name === "tata motors limited" ||
    name.includes("commercial vehicles")
  ) {
    return { ...cleaned, name: TATA_COMMERCIAL_NAME, symbol: "TMCV" };
  }

  if (!raw) {
    const { symbol: _drop, ...rest } = cleaned;
    return rest as Investment;
  }
  return { ...cleaned, symbol: raw };
}

function keyOf(investment: Investment) {
  return (investment.symbol ?? investment.name).trim().toUpperCase();
}

/** Removes duplicate holdings, keeping the richest record for each symbol/name. */
export function dedupeInvestments(list: Investment[]): Investment[] {
  const byKey = new Map<string, Investment>();
  for (const item of list.map(normalizeSymbol)) {
    const key = keyOf(item);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, item);
      continue;
    }
    // Prefer the user-edited (non-demo) record, then the one with more units.
    const preferNew =
      (existing.demo && !item.demo) ||
      (existing.demo === item.demo && (item.units ?? 0) > (existing.units ?? 0));
    if (preferNew) byKey.set(key, item);
  }
  return [...byKey.values()];
}

export function loadPortfolio(): PortfolioData {
  if (typeof window === "undefined") return sampleData;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      window.localStorage.setItem(SAMPLE_VERSION_KEY, SAMPLE_VERSION);
      return sampleData;
    }
    const parsed = JSON.parse(raw) as Partial<PortfolioData>;
    const stored = Array.isArray(parsed.investments) ? parsed.investments : [];
    const assets = Array.isArray(parsed.assets) ? parsed.assets : [];

    if (window.localStorage.getItem(SAMPLE_VERSION_KEY) !== SAMPLE_VERSION) {
      window.localStorage.setItem(SAMPLE_VERSION_KEY, SAMPLE_VERSION);
      // Existing rows win; only genuinely missing sample holdings get added.
      return {
        investments: dedupeInvestments([...stored, ...sampleData.investments]),
        assets,
      };
    }

    return { investments: dedupeInvestments(stored), assets };
  } catch {
    return sampleData;
  }
}

export function savePortfolio(data: PortfolioData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable */
  }
}

export const newId = () => Math.random().toString(36).slice(2, 10);
