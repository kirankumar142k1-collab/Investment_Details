import type { Asset, Investment } from "./types";

export const invested = (i: Investment) => i.units * i.avgPrice;
export const currentValue = (i: Investment) => i.units * i.currentPrice;
export const gain = (inv: number, cur: number) => cur - inv;
export const returnPct = (inv: number, cur: number) => (inv > 0 ? ((cur - inv) / inv) * 100 : 0);

export function investmentTotals(list: Investment[]) {
  const totalInvested = list.reduce((s, i) => s + invested(i), 0);
  const totalCurrent = list.reduce((s, i) => s + currentValue(i), 0);
  return {
    totalInvested,
    totalCurrent,
    gain: totalCurrent - totalInvested,
    returnPct: returnPct(totalInvested, totalCurrent),
    count: list.length,
  };
}

export function assetTotals(list: Asset[]) {
  const active = list.filter((a) => a.status !== "Closed");
  const sum = (arr: Asset[], key: "invested" | "currentValue") =>
    arr.reduce((s, a) => s + (a[key] || 0), 0);
  const insurance = active.filter((a) => a.category === "Insurance");
  const savingsCats = ["Savings Account", "Fixed Deposit", "Recurring Deposit", "PPF", "EPF/PF"];
  const savings = active.filter((a) => savingsCats.includes(a.category));
  return {
    totalInvested: sum(active, "invested"),
    totalCurrent: sum(active, "currentValue"),
    totalSavings: sum(savings, "currentValue"),
    totalInsurance: sum(insurance, "currentValue"),
    totalAssets: sum(
      active.filter((a) => !savingsCats.includes(a.category) && a.category !== "Insurance"),
      "currentValue",
    ),
    count: active.length,
  };
}

export const inr = (n: number, compact = false) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
  }).format(Number.isFinite(n) ? n : 0);

export const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
