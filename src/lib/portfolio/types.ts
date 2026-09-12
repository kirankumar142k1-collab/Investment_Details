export type InvestmentType = "Stock" | "Mutual Fund" | "ETF" | "Other";

export const INVESTMENT_TYPES: InvestmentType[] = ["Stock", "Mutual Fund", "ETF", "Other"];

export type Investment = {
  id: string;
  name: string;
  symbol?: string | undefined;
  type: InvestmentType;
  units: number;
  avgPrice: number;
  currentPrice: number;
  lastPriceUpdated?: string | undefined;
  notes?: string | undefined;
  demo?: boolean | undefined;
};

export type AssetCategory =
  | "PPF"
  | "EPF/PF"
  | "Insurance"
  | "Savings Account"
  | "Fixed Deposit"
  | "Recurring Deposit"
  | "Gold"
  | "Digital Gold"
  | "Bonds"
  | "NPS"
  | "Other Assets";

export const ASSET_CATEGORIES: AssetCategory[] = [
  "PPF",
  "EPF/PF",
  "Insurance",
  "Savings Account",
  "Fixed Deposit",
  "Recurring Deposit",
  "Gold",
  "Digital Gold",
  "Bonds",
  "NPS",
  "Other Assets",
];

export type AssetStatus = "Active" | "Matured" | "Closed";

export type Asset = {
  id: string;
  name: string;
  category: AssetCategory;
  institution?: string | undefined;
  invested: number;
  currentValue: number;
  maturityDate?: string | undefined;
  interestRate?: number | undefined;
  status: AssetStatus;
  notes?: string | undefined;
  demo?: boolean | undefined;
};

export type PortfolioData = {
  investments: Investment[];
  assets: Asset[];
};
