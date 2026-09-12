export type KnownInstrument = {
  name: string;
  symbol: string;
  type: "Stock" | "ETF";
  exchange: "NSE";
};

/** Frequently used NSE instruments kept locally so search still works if a public provider is unavailable. */
export const KNOWN_INDIAN_INSTRUMENTS: KnownInstrument[] = [
  { name: "Indian Railway Finance Corporation Limited", symbol: "IRFC", type: "Stock", exchange: "NSE" },
  { name: "ITC Hotels Limited", symbol: "ITCHOTELS", type: "Stock", exchange: "NSE" },
  { name: "ITC Limited", symbol: "ITC", type: "Stock", exchange: "NSE" },
  { name: "Kaynes Technology India Limited", symbol: "KAYNES", type: "Stock", exchange: "NSE" },
  { name: "Nippon India ETF Gold BeES", symbol: "GOLDBEES", type: "ETF", exchange: "NSE" },
  { name: "PC Jeweller Limited", symbol: "PCJEWELLER", type: "Stock", exchange: "NSE" },
  { name: "Suzlon Energy Limited", symbol: "SUZLON", type: "Stock", exchange: "NSE" },
  { name: "Tata Motors Commercial Vehicles Limited", symbol: "TMCV", type: "Stock", exchange: "NSE" },
  { name: "Tata Motors Passenger Vehicles Limited", symbol: "TMPV", type: "Stock", exchange: "NSE" },
  { name: "Trident Limited", symbol: "TRIDENT", type: "Stock", exchange: "NSE" },
  { name: "Ujjivan Small Finance Bank Limited", symbol: "UJJIVANSFB", type: "Stock", exchange: "NSE" },
];