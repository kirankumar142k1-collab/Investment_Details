import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INVESTMENT_TYPES, type Investment, type InvestmentType } from "@/lib/portfolio/types";
import { newId } from "@/lib/portfolio/storage";
import { searchSymbols } from "@/lib/portfolio/search.functions";
import { Loader2, Search } from "lucide-react";

type Suggestion = {
  name: string;
  symbol?: string;
  type: "Stock" | "ETF" | "Mutual Fund";
  exchange?: string;
};

const empty = {
  name: "",
  symbol: "",
  type: "Stock" as InvestmentType,
  units: "",
  avgPrice: "",
  currentPrice: "",
  notes: "",
};

export function InvestmentDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Investment | null;
  onSave: (inv: Investment) => void;
}) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showList, setShowList] = useState(false);
  const searchSymbolsFn = useServerFn(searchSymbols);

  useEffect(() => {
    if (!open) return;
    setSuggestions([]);
    setShowList(false);
    setQuery("");
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      searchSymbolsFn({ data: { query: q } })
        .then((r) => {
          if (cancelled) return;
          setSuggestions((r.results ?? []) as Suggestion[]);
          setShowList(true);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, searchSymbolsFn]);

  const pick = (s: Suggestion) => {
    setForm((f) => ({ ...f, name: s.name, symbol: s.symbol ?? "", type: s.type }));
    setQuery("");
    setSuggestions([]);
    setShowList(false);
  };


  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      initial
        ? {
            name: initial.name,
            symbol: initial.symbol ?? "",
            type: initial.type,
            units: String(initial.units),
            avgPrice: String(initial.avgPrice),
            currentPrice: String(initial.currentPrice),
            notes: initial.notes ?? "",
          }
        : empty,
    );
  }, [open, initial]);

  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const units = Number(form.units);
    const avgPrice = Number(form.avgPrice);
    const currentPrice = form.currentPrice === "" ? avgPrice : Number(form.currentPrice);
    if (!form.name.trim()) return setError("Asset name is required.");
    if (!Number.isFinite(units) || units <= 0) return setError("Units must be a positive number.");
    if (!Number.isFinite(avgPrice) || avgPrice <= 0)
      return setError("Average price must be a positive number.");
    if (!Number.isFinite(currentPrice) || currentPrice < 0)
      return setError("Current price is invalid.");

    onSave({
      id: initial?.id ?? newId(),
      name: form.name.trim(),
      symbol: form.symbol.trim() || undefined,
      type: form.type,
      units,
      avgPrice,
      currentPrice,
      notes: form.notes.trim() || undefined,
      lastPriceUpdated: initial?.lastPriceUpdated,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit investment" : "Add investment"}</DialogTitle>
          <DialogDescription>
            Values update your totals, gain/loss and allocation automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="relative grid gap-2 sm:col-span-2">
            <Label htmlFor="inv-search">Search stock, ETF or mutual fund</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="inv-search"
                className="pl-9"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowList(true)}
                placeholder="e.g. Tata Motors, NIFTYBEES, Parag Parikh Flexi Cap"
              />
              {searching ? (
                <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : null}
            </div>
            {showList && suggestions.length > 0 ? (
              <ul className="absolute top-full z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border bg-popover p-1 shadow-md">
                {suggestions.map((s, i) => (
                  <li key={`${s.type}-${s.symbol ?? s.name}-${i}`}>
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        pick(s);
                      }}
                      onClick={() => pick(s)}
                      className="flex w-full items-start justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{s.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {s.symbol ? `${s.symbol} · ` : ""}
                          {s.type}
                          {s.exchange ? ` · ${s.exchange}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {query.trim().length >= 2 && !searching && suggestions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No matches — you can still enter the details manually below.
              </p>
            ) : null}
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="inv-name">Asset name</Label>
            <Input
              id="inv-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Reliance Industries"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="inv-symbol">Symbol (optional)</Label>
            <Input
              id="inv-symbol"
              value={form.symbol}
              onChange={(e) => set("symbol", e.target.value)}
              placeholder="RELIANCE"
            />
          </div>
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVESTMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="inv-units">Units</Label>
            <Input
              id="inv-units"
              inputMode="decimal"
              value={form.units}
              onChange={(e) => set("units", e.target.value)}
              placeholder="40"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="inv-avg">Avg. buy price (₹)</Label>
            <Input
              id="inv-avg"
              inputMode="decimal"
              value={form.avgPrice}
              onChange={(e) => set("avgPrice", e.target.value)}
              placeholder="2450"
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="inv-cur">Current price (₹)</Label>
            <Input
              id="inv-cur"
              inputMode="decimal"
              value={form.currentPrice}
              onChange={(e) => set("currentPrice", e.target.value)}
              placeholder="Defaults to average price"
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="inv-notes">Notes (optional)</Label>
            <Input
              id="inv-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>{initial ? "Save changes" : "Add investment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
