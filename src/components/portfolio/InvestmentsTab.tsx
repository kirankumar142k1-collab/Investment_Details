import { useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownUp,
  Download,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatCard } from "./StatCard";
import { InvestmentDialog } from "./InvestmentDialog";
import { INVESTMENT_TYPES, type Investment } from "@/lib/portfolio/types";
import { currentValue, inr, invested, investmentTotals, pct, returnPct } from "@/lib/portfolio/calc";
import { exportInvestmentsCSV, importInvestmentsCSV } from "@/lib/portfolio/io";
import { REFRESH_INTERVALS, usePriceRefresh, type RefreshInterval } from "@/hooks/use-price-refresh";

type SortKey = "invested" | "current" | "return" | "name";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function InvestmentsTab({
  investments,
  setInvestments,
}: {
  investments: Investment[];
  setInvestments: (updater: (prev: Investment[]) => Investment[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("current");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [detail, setDetail] = useState<Investment | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { refreshing, refresh, intervalMinutes, setIntervalMinutes, lastRefreshed } =
    usePriceRefresh(investments, setInvestments);

  const totals = investmentTotals(investments);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = investments.filter(
      (i) =>
        (typeFilter === "all" || i.type === typeFilter) &&
        (q === "" ||
          i.name.toLowerCase().includes(q) ||
          (i.symbol ?? "").toLowerCase().includes(q)),
    );
    return [...list].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "invested") return invested(b) - invested(a);
      if (sortKey === "current") return currentValue(b) - currentValue(a);
      return (
        returnPct(invested(b), currentValue(b)) - returnPct(invested(a), currentValue(a))
      );
    });
  }, [investments, query, typeFilter, sortKey]);

  const allocation = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of investments) map.set(i.type, (map.get(i.type) ?? 0) + currentValue(i));
    return [...map.entries()]
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .filter((d) => d.value > 0);
  }, [investments]);

  const compare = useMemo(
    () =>
      allocation.map((a) => {
        const list = investments.filter((i) => i.type === a.name);
        return {
          name: a.name,
          Invested: Math.round(list.reduce((s, i) => s + invested(i), 0)),
          Current: Math.round(list.reduce((s, i) => s + currentValue(i), 0)),
        };
      }),
    [allocation, investments],
  );

  const gainDistribution = useMemo(
    () =>
      [...investments]
        .map((i) => ({
          name: i.symbol?.trim() || i.name,
          gain: Math.round(currentValue(i) - invested(i)),
        }))
        .sort((a, b) => b.gain - a.gain),
    [investments],
  );

  const upsert = (inv: Investment) => {
    setInvestments((prev) =>
      prev.some((p) => p.id === inv.id)
        ? prev.map((p) => (p.id === inv.id ? inv : p))
        : [...prev, inv],
    );
    toast.success(editing ? "Investment updated" : "Investment added");
  };

  const remove = (id: string) => {
    setInvestments((prev) => prev.filter((p) => p.id !== id));
    toast.success("Investment deleted");
  };

  const onRefreshPrices = () => void refresh();


  const onImport = async (file: File) => {
    try {
      const parsed = importInvestmentsCSV(await file.text());
      if (parsed.length === 0) {
        toast.error("No valid rows found in that file");
        return;
      }
      setInvestments((prev) => [...prev, ...parsed]);
      toast.success(`Imported ${parsed.length} investments`);
    } catch {
      toast.error("Could not read that file");
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total Invested" value={inr(totals.totalInvested)} />
        <StatCard label="Current Value" value={inr(totals.totalCurrent)} />
        <StatCard
          label="Gain / Loss"
          value={inr(totals.gain)}
          tone={totals.gain >= 0 ? "success" : "danger"}
        />
        <StatCard
          label="Return %"
          value={pct(totals.returnPct)}
          tone={totals.gain >= 0 ? "success" : "danger"}
        />
        <StatCard
          label="Holdings"
          value={totals.count}
          sub="Market-linked instruments"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div className="card-elevated p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative lg:max-w-xs lg:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search holdings"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {INVESTMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-[160px]">
                <ArrowDownUp className="size-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current value</SelectItem>
                <SelectItem value="invested">Invested</SelectItem>
                <SelectItem value="return">Return %</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={onRefreshPrices} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Live prices
            </Button>
            <Select
              value={String(intervalMinutes)}
              onValueChange={(v) => setIntervalMinutes(Number(v) as RefreshInterval)}
            >
              <SelectTrigger className="w-[150px]" aria-label="Auto-refresh interval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFRESH_INTERVALS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m === 0 ? "Auto-refresh off" : `Every ${m} min`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" />
              Import
            </Button>
            <Button variant="outline" onClick={() => exportInvestmentsCSV(investments)}>
              <Download className="size-4" />
              Export
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add investment
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImport(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Stocks & ETFs
          {lastRefreshed
            ? ` · prices last refreshed ${new Date(lastRefreshed).toLocaleString("en-IN")}`
            : " · prices not refreshed yet"}
          {intervalMinutes > 0 ? ` · auto-refreshing every ${intervalMinutes} min` : ""}
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Asset</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 text-right font-medium">Invested</th>
                <th className="py-2 pr-3 text-right font-medium">Current</th>
                <th className="py-2 pr-3 text-right font-medium">Gain/Loss</th>
                <th className="py-2 pr-3 text-right font-medium">Return %</th>
                <th className="py-2 pr-3 text-right font-medium">Units</th>
                <th className="py-2 pr-3 text-right font-medium">Avg. Price</th>
                <th className="py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => {
                const inv = invested(i);
                const cur = currentValue(i);
                const g = cur - inv;
                return (
                  <tr
                    key={i.id}
                    onClick={() => setDetail(i)}
                    className="cursor-pointer border-b last:border-0 hover:bg-secondary/60"
                  >
                    <td className="py-3 pr-3">
                      <div className="font-medium">{i.name}</div>
                      {i.symbol ? (
                        <div className="text-xs text-muted-foreground">{i.symbol}</div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3">
                      <Badge variant="secondary">{i.type}</Badge>
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums">{inr(inv)}</td>
                    <td className="py-3 pr-3 text-right tabular-nums">{inr(cur)}</td>
                    <td
                      className={`py-3 pr-3 text-right tabular-nums ${g >= 0 ? "text-success" : "text-danger"}`}
                    >
                      {inr(g)}
                    </td>
                    <td
                      className={`py-3 pr-3 text-right tabular-nums ${g >= 0 ? "text-success" : "text-danger"}`}
                    >
                      {pct(returnPct(inv, cur))}
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums">{i.units}</td>
                    <td className="py-3 pr-3 text-right tabular-nums">{inr(i.avgPrice)}</td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${i.name}`}
                          onClick={() => {
                            setEditing(i);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${i.name}`}
                          onClick={() => remove(i.id)}
                        >
                          <Trash2 className="size-4 text-danger" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {investments.length === 0
                ? "No investments yet. Add your first holding to get started."
                : "No holdings match your search or filter."}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-elevated p-4 sm:p-5">
          <h3 className="text-sm font-semibold">Allocation by type</h3>
          <div className="mt-2 h-64">
            {allocation.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocation}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  isAnimationActive={false}
                  >
                    {allocation.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => inr(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>

        <div className="card-elevated p-4 sm:p-5">
          <h3 className="text-sm font-semibold">Invested vs current</h3>
          <div className="mt-2 h-64">
            {compare.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compare}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v: number) => inr(v, true)} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => inr(v)} />
                  <Legend />
                  <Bar isAnimationActive={false} dataKey="Invested" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                  <Bar isAnimationActive={false} dataKey="Current" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>

        <div className="card-elevated p-4 sm:p-5">
          <h3 className="text-sm font-semibold">Gain / loss by holding</h3>
          <div className="mt-2 h-64">
            {gainDistribution.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gainDistribution} layout="vertical" margin={{ left: 8 }}>
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => inr(v, true)}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => inr(v)} />
                  <Bar isAnimationActive={false} dataKey="gain" radius={[0, 6, 6, 0]}>
                    {gainDistribution.map((d, idx) => (
                      <Cell key={idx} fill={d.gain >= 0 ? "var(--success)" : "var(--danger)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>
      </div>

      <InvestmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSave={upsert}
      />

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{detail?.name}</DialogTitle>
            <DialogDescription>
              {detail?.type}
              {detail?.symbol ? ` · ${detail.symbol}` : ""}
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="Units" value={String(detail.units)} />
              <Detail label="Avg. price" value={inr(detail.avgPrice)} />
              <Detail label="Current price" value={inr(detail.currentPrice)} />
              <Detail label="Invested" value={inr(invested(detail))} />
              <Detail label="Current value" value={inr(currentValue(detail))} />
              <Detail
                label="Unrealized gain/loss"
                value={`${inr(currentValue(detail) - invested(detail))} (${pct(
                  returnPct(invested(detail), currentValue(detail)),
                )})`}
              />
              <Detail
                label="Price updated"
                value={
                  detail.lastPriceUpdated
                    ? new Date(detail.lastPriceUpdated).toLocaleString("en-IN")
                    : "Last saved price"
                }
              />
              {detail.notes ? <Detail label="Notes" value={detail.notes} /> : null}
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Nothing to chart yet
    </div>
  );
}
