import { useMemo, useRef, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowDownUp, Download, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
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
import { StatCard } from "./StatCard";
import { AssetDialog } from "./AssetDialog";
import { ASSET_CATEGORIES, type Asset } from "@/lib/portfolio/types";
import { assetTotals, inr, pct, returnPct } from "@/lib/portfolio/calc";
import { exportAssetsCSV, importAssetsCSV } from "@/lib/portfolio/io";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function AssetsTab({
  assets,
  setAssets,
}: {
  assets: Asset[];
  setAssets: (updater: (prev: Asset[]) => Asset[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sortKey, setSortKey] = useState<"current" | "invested" | "name">("current");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const totals = assetTotals(assets);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = assets.filter(
      (a) =>
        (category === "all" || a.category === category) &&
        (q === "" ||
          a.name.toLowerCase().includes(q) ||
          (a.institution ?? "").toLowerCase().includes(q)),
    );
    return [...list].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "invested") return b.invested - a.invested;
      return b.currentValue - a.currentValue;
    });
  }, [assets, query, category, sortKey]);

  const allocation = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assets.filter((x) => x.status !== "Closed"))
      map.set(a.category, (map.get(a.category) ?? 0) + a.currentValue);
    return [...map.entries()]
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [assets]);

  const upsert = (a: Asset) => {
    setAssets((prev) =>
      prev.some((p) => p.id === a.id) ? prev.map((p) => (p.id === a.id ? a : p)) : [...prev, a],
    );
    toast.success(editing ? "Asset updated" : "Asset added");
  };

  const remove = (id: string) => {
    setAssets((prev) => prev.filter((p) => p.id !== id));
    toast.success("Asset deleted");
  };

  const onImport = async (file: File) => {
    try {
      const parsed = importAssetsCSV(await file.text());
      if (parsed.length === 0) {
        toast.error("No valid rows found in that file");
        return;
      }
      setAssets((prev) => [...prev, ...parsed]);
      toast.success(`Imported ${parsed.length} assets`);
    } catch {
      toast.error("Could not read that file");
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total Savings" value={inr(totals.totalSavings)} sub="PPF, EPF, FD, RD, SB" />
        <StatCard label="Total Asset Value" value={inr(totals.totalAssets)} sub="Gold, bonds, NPS…" />
        <StatCard label="Insurance Value" value={inr(totals.totalInsurance)} />
        <StatCard label="Non-Market Assets" value={inr(totals.totalCurrent)} />
        <StatCard
          label="Gain over deposits"
          value={inr(totals.totalCurrent - totals.totalInvested)}
          sub={pct(returnPct(totals.totalInvested, totals.totalCurrent))}
          tone={totals.totalCurrent - totals.totalInvested >= 0 ? "success" : "danger"}
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
              placeholder="Search assets"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {ASSET_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as typeof sortKey)}>
              <SelectTrigger className="w-[160px]">
                <ArrowDownUp className="size-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current value</SelectItem>
                <SelectItem value="invested">Deposited</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" />
              Import
            </Button>
            <Button variant="outline" onClick={() => exportAssetsCSV(assets)}>
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
              Add asset
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

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Asset</th>
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 font-medium">Institution</th>
                <th className="py-2 pr-3 text-right font-medium">Deposited</th>
                <th className="py-2 pr-3 text-right font-medium">Current</th>
                <th className="py-2 pr-3 font-medium">Maturity</th>
                <th className="py-2 pr-3 text-right font-medium">Interest</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-secondary/60">
                  <td className="py-3 pr-3">
                    <div className="font-medium">{a.name}</div>
                    {a.notes ? (
                      <div className="max-w-[220px] truncate text-xs text-muted-foreground">
                        {a.notes}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-3 pr-3">
                    <Badge variant="secondary">{a.category}</Badge>
                  </td>
                  <td className="py-3 pr-3 text-muted-foreground">{a.institution ?? "—"}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{inr(a.invested)}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{inr(a.currentValue)}</td>
                  <td className="py-3 pr-3 text-muted-foreground">
                    {a.maturityDate
                      ? new Date(a.maturityDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums">
                    {a.interestRate != null ? `${a.interestRate}%` : "—"}
                  </td>
                  <td className="py-3 pr-3">
                    <Badge variant={a.status === "Active" ? "default" : "outline"}>{a.status}</Badge>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${a.name}`}
                        onClick={() => {
                          setEditing(a);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${a.name}`}
                        onClick={() => remove(a.id)}
                      >
                        <Trash2 className="size-4 text-danger" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {assets.length === 0
                ? "No savings or assets yet. Add your first record."
                : "No assets match your search or filter."}
            </p>
          ) : null}
        </div>
      </div>

      <div className="card-elevated p-4 sm:p-5">
        <h3 className="text-sm font-semibold">Allocation by category</h3>
        <div className="mt-2 h-72">
          {allocation.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocation}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={95}
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
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Nothing to chart yet
            </div>
          )}
        </div>
      </div>

      <AssetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSave={upsert}
      />
    </div>
  );
}
