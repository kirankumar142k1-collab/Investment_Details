import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { refreshPrices } from "@/lib/portfolio/marketPrices";
import type { Investment } from "@/lib/portfolio/types";

const INTERVAL_KEY = "portfolio.priceRefresh.intervalMinutes";
const LAST_KEY = "portfolio.priceRefresh.lastRefreshed";

/** Allowed auto-refresh cadences in minutes; 0 = off. */
export const REFRESH_INTERVALS = [0, 5, 15, 30, 60] as const;
export type RefreshInterval = (typeof REFRESH_INTERVALS)[number];

export function usePriceRefresh(
  investments: Investment[],
  setInvestments: (updater: (prev: Investment[]) => Investment[]) => void,
) {
  const [refreshing, setRefreshing] = useState(false);
  const [intervalMinutes, setIntervalMinutesState] = useState<RefreshInterval>(0);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  // Read persisted settings only after hydration.
  useEffect(() => {
    const raw = Number(localStorage.getItem(INTERVAL_KEY));
    if (REFRESH_INTERVALS.includes(raw as RefreshInterval)) {
      setIntervalMinutesState(raw as RefreshInterval);
    }
    setLastRefreshed(localStorage.getItem(LAST_KEY));
  }, []);

  const setIntervalMinutes = useCallback((value: RefreshInterval) => {
    setIntervalMinutesState(value);
    localStorage.setItem(INTERVAL_KEY, String(value));
  }, []);

  // Keep the latest investments available to the scheduled tick without
  // re-creating the timer on every price change.
  const investmentsRef = useRef(investments);
  investmentsRef.current = investments;
  const runningRef = useRef(false);

  const refresh = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (runningRef.current) return;
      runningRef.current = true;
      setRefreshing(true);
      const result = await refreshPrices(investmentsRef.current);
      setRefreshing(false);
      runningRef.current = false;

      const updated = Object.keys(result.prices).length;
      if (updated > 0) {
        const stamp = new Date().toISOString();
        setInvestments((prev) =>
          prev.map((i) => {
            const p = i.symbol ? result.prices[i.symbol.toUpperCase()] : undefined;
            return p ? { ...i, currentPrice: p, lastPriceUpdated: stamp } : i;
          }),
        );
        setLastRefreshed(stamp);
        localStorage.setItem(LAST_KEY, stamp);
        if (!silent) toast.success(`Updated ${updated} live price${updated > 1 ? "s" : ""}`);
      } else if (!silent) {
        toast.error(result.error ?? "Live prices unavailable", {
          description: "Showing last saved prices instead.",
        });
      }
    },
    [setInvestments],
  );

  // Scheduled refresh.
  useEffect(() => {
    if (intervalMinutes === 0) return;
    const id = setInterval(() => void refresh({ silent: true }), intervalMinutes * 60_000);
    return () => clearInterval(id);
  }, [intervalMinutes, refresh]);

  return { refreshing, refresh, intervalMinutes, setIntervalMinutes, lastRefreshed };
}
