import type { Asset, AssetCategory, AssetStatus, Investment, InvestmentType, PortfolioData } from "./types";
import { ASSET_CATEGORIES, INVESTMENT_TYPES } from "./types";
import { currentValue, invested } from "./calc";
import { newId } from "./storage";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const esc = (v: unknown) => {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportInvestmentsCSV(list: Investment[]) {
  const header = [
    "Name",
    "Symbol",
    "Type",
    "Units",
    "Avg Price",
    "Current Price",
    "Invested",
    "Current Value",
    "Gain/Loss",
  ];
  const rows = list.map((i) => [
    i.name,
    i.symbol ?? "",
    i.type,
    i.units,
    i.avgPrice,
    i.currentPrice,
    invested(i),
    currentValue(i),
    currentValue(i) - invested(i),
  ]);
  download(
    "investments.csv",
    [header, ...rows].map((r) => r.map(esc).join(",")).join("\n"),
    "text/csv",
  );
}

export function exportAssetsCSV(list: Asset[]) {
  const header = [
    "Name",
    "Category",
    "Institution",
    "Invested",
    "Current Value",
    "Maturity Date",
    "Interest %",
    "Status",
    "Notes",
  ];
  const rows = list.map((a) => [
    a.name,
    a.category,
    a.institution ?? "",
    a.invested,
    a.currentValue,
    a.maturityDate ?? "",
    a.interestRate ?? "",
    a.status,
    a.notes ?? "",
  ]);
  download(
    "savings-assets.csv",
    [header, ...rows].map((r) => r.map(esc).join(",")).join("\n"),
    "text/csv",
  );
}

export function exportBackup(data: PortfolioData) {
  download("portfolio-backup.json", JSON.stringify(data, null, 2), "application/json");
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

const num = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export function importInvestmentsCSV(text: string): Investment[] {
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const head = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
  const idx = (n: string) => head.findIndex((h) => h.includes(n));
  const iName = idx("name") >= 0 ? idx("name") : 0;
  const iSym = idx("symbol");
  const iType = idx("type");
  const iUnits = idx("unit");
  const iAvg = idx("avg");
  const iCur = idx("current price") >= 0 ? idx("current price") : idx("price");

  return rows.slice(1).map((r) => {
    const rawType = (r[iType] ?? "").trim();
    const type = (INVESTMENT_TYPES.find((t) => t.toLowerCase() === rawType.toLowerCase()) ??
      "Other") as InvestmentType;
    const avgPrice = num(r[iAvg]);
    return {
      id: newId(),
      name: (r[iName] ?? "Untitled").trim() || "Untitled",
      symbol: iSym >= 0 ? r[iSym]?.trim() : undefined,
      type,
      units: num(r[iUnits]),
      avgPrice,
      currentPrice: iCur >= 0 && num(r[iCur]) > 0 ? num(r[iCur]) : avgPrice,
    } satisfies Investment;
  });
}

export function importAssetsCSV(text: string): Asset[] {
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const head = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
  const idx = (n: string) => head.findIndex((h) => h.includes(n));
  const iName = idx("name") >= 0 ? idx("name") : 0;
  const iCat = idx("categ");
  const iInst = idx("institut");
  const iInv = idx("invest");
  const iCur = idx("current");
  const iMat = idx("maturity");
  const iInt = idx("interest");
  const iStatus = idx("status");
  const iNotes = idx("note");

  return rows.slice(1).map((r) => {
    const rawCat = (r[iCat] ?? "").trim().toLowerCase();
    const category = (ASSET_CATEGORIES.find((c) => c.toLowerCase() === rawCat) ??
      "Other Assets") as AssetCategory;
    const rawStatus = (r[iStatus] ?? "").trim().toLowerCase();
    const status = (["active", "matured", "closed"].includes(rawStatus)
      ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)
      : "Active") as AssetStatus;
    const investedAmt = num(r[iInv]);
    return {
      id: newId(),
      name: (r[iName] ?? "Untitled").trim() || "Untitled",
      category,
      institution: iInst >= 0 ? r[iInst]?.trim() : undefined,
      invested: investedAmt,
      currentValue: iCur >= 0 && num(r[iCur]) > 0 ? num(r[iCur]) : investedAmt,
      maturityDate: iMat >= 0 ? r[iMat]?.trim() || undefined : undefined,
      interestRate: iInt >= 0 ? num(r[iInt]) : undefined,
      status,
      notes: iNotes >= 0 ? r[iNotes]?.trim() || undefined : undefined,
    } satisfies Asset;
  });
}

export function parseBackup(text: string): PortfolioData | null {
  try {
    const parsed = JSON.parse(text) as Partial<PortfolioData>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      investments: Array.isArray(parsed.investments) ? parsed.investments : [],
      assets: Array.isArray(parsed.assets) ? parsed.assets : [],
    };
  } catch {
    return null;
  }
}
