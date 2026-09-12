import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Database, Moon, RotateCcw, Save, Sun, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InvestmentsTab } from "@/components/portfolio/InvestmentsTab";
import { AssetsTab } from "@/components/portfolio/AssetsTab";
import { loadPortfolio, savePortfolio } from "@/lib/portfolio/storage";
import { exportBackup, parseBackup } from "@/lib/portfolio/io";
import { assetTotals, inr, investmentTotals, pct, returnPct } from "@/lib/portfolio/calc";
import type { Asset, Investment, PortfolioData } from "@/lib/portfolio/types";

const TITLE = "Portfolio Tracker — Investments, Savings & Assets";
const DESC =
  "A simple personal finance dashboard to track invested amount, current value, gains and allocation across stocks, mutual funds, ETFs, PPF, EPF, gold, FDs and more.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [data, setData] = useState<PortfolioData>({ investments: [], assets: [] });
  const [ready, setReady] = useState(false);
  const [dark, setDark] = useState(false);
  const restoreRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setData(loadPortfolio());
    const preferDark = window.localStorage.getItem("portfolio-theme") === "dark";
    setDark(preferDark);
    document.documentElement.classList.toggle("dark", preferDark);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) savePortfolio(data);
  }, [data, ready]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("portfolio-theme", next ? "dark" : "light");
  };

  const setInvestments = useCallback(
    (updater: (prev: Investment[]) => Investment[]) =>
      setData((d) => ({ ...d, investments: updater(d.investments) })),
    [],
  );
  const setAssets = useCallback(
    (updater: (prev: Asset[]) => Asset[]) => setData((d) => ({ ...d, assets: updater(d.assets) })),
    [],
  );

  const invTotals = investmentTotals(data.investments);
  const astTotals = assetTotals(data.assets);
  const totalInvested = invTotals.totalInvested + astTotals.totalInvested;
  const totalCurrent = invTotals.totalCurrent + astTotals.totalCurrent;
  const totalGain = totalCurrent - totalInvested;

  const allocation = useMemo(
    () =>
      [
        { name: "Market-linked", value: Math.round(invTotals.totalCurrent) },
        { name: "Non-market", value: Math.round(astTotals.totalCurrent) },
      ].filter((d) => d.value > 0),
    [invTotals.totalCurrent, astTotals.totalCurrent],
  );

  const marketShare = totalCurrent > 0 ? (invTotals.totalCurrent / totalCurrent) * 100 : 0;
  const hasDemo = data.investments.some((i) => i.demo) || data.assets.some((a) => a.demo);

  const onRestore = async (file: File) => {
    const parsed = parseBackup(await file.text());
    if (!parsed) {
      toast.error("That file isn't a valid portfolio backup");
      return;
    }
    setData(parsed);
    toast.success("Portfolio restored from backup");
  };

  return (
    <main className="min-h-screen bg-background pb-16">
      <header className="hero-gradient text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm opacity-90">
                <Wallet className="size-4" />
                Personal Portfolio
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                Net Portfolio Summary
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasDemo ? (
                <Badge variant="outline" className="border-current bg-transparent">
                  <Database className="size-3" /> Demo Data
                </Badge>
              ) : null}
              <Button variant="ghost" size="sm" onClick={() => exportBackup(data)}>
                <Save className="size-4" /> Backup
              </Button>
              <Button variant="ghost" size="sm" onClick={() => restoreRef.current?.click()}>
                <RotateCcw className="size-4" /> Restore
              </Button>
              <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggleTheme}>
                {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
              <input
                ref={restoreRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onRestore(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_260px]">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <HeroStat label="Total Invested" value={inr(totalInvested)} />
              <HeroStat label="Current Value" value={inr(totalCurrent)} />
              <HeroStat
                label="Total Gain"
                value={inr(totalGain)}
                sub={pct(returnPct(totalInvested, totalCurrent))}
              />
              <HeroStat
                label="Allocation"
                value={`${marketShare.toFixed(0)}% market`}
                sub={`${(100 - marketShare).toFixed(0)}% non-market`}
              />
            </div>
            <div className="h-40 rounded-xl bg-white/10 p-2">
              {allocation.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocation}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={38}
                      outerRadius={62}
                      paddingAngle={2}
                      isAnimationActive={false}
                      stroke="none"
                    >
                      {allocation.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? "var(--chart-3)" : "var(--chart-2)"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => inr(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm opacity-80">
                  Add records to see allocation
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Tabs defaultValue="investments" className="mt-6">
          <TabsList className="h-11 w-full max-w-md rounded-xl">
            <TabsTrigger value="investments" className="flex-1 rounded-lg">
              Investments
            </TabsTrigger>
            <TabsTrigger value="assets" className="flex-1 rounded-lg">
              Savings &amp; Assets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="investments" className="mt-5">
            <InvestmentsTab investments={data.investments} setInvestments={setInvestments} />
          </TabsContent>
          <TabsContent value="assets" className="mt-5">
            <AssetsTab assets={data.assets} setAssets={setAssets} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function HeroStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold tabular-nums sm:text-xl">{value}</p>
      {sub ? <p className="text-xs opacity-80">{sub}</p> : null}
    </div>
  );
}
