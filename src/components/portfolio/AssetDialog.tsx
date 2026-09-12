import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ASSET_CATEGORIES,
  type Asset,
  type AssetCategory,
  type AssetStatus,
} from "@/lib/portfolio/types";
import { newId } from "@/lib/portfolio/storage";

const STATUSES: AssetStatus[] = ["Active", "Matured", "Closed"];

const empty = {
  name: "",
  category: "PPF" as AssetCategory,
  institution: "",
  invested: "",
  currentValue: "",
  maturityDate: "",
  interestRate: "",
  status: "Active" as AssetStatus,
  notes: "",
};

export function AssetDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Asset | null;
  onSave: (a: Asset) => void;
}) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      initial
        ? {
            name: initial.name,
            category: initial.category,
            institution: initial.institution ?? "",
            invested: String(initial.invested),
            currentValue: String(initial.currentValue),
            maturityDate: initial.maturityDate ?? "",
            interestRate: initial.interestRate != null ? String(initial.interestRate) : "",
            status: initial.status,
            notes: initial.notes ?? "",
          }
        : empty,
    );
  }, [open, initial]);

  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const investedAmt = Number(form.invested);
    const cur = form.currentValue === "" ? investedAmt : Number(form.currentValue);
    if (!form.name.trim()) return setError("Asset name is required.");
    if (!Number.isFinite(investedAmt) || investedAmt < 0)
      return setError("Invested amount is invalid.");
    if (!Number.isFinite(cur) || cur < 0) return setError("Current value is invalid.");

    onSave({
      id: initial?.id ?? newId(),
      name: form.name.trim(),
      category: form.category,
      institution: form.institution.trim() || undefined,
      invested: investedAmt,
      currentValue: cur,
      maturityDate: form.maturityDate || undefined,
      interestRate: form.interestRate === "" ? undefined : Number(form.interestRate),
      status: form.status,
      notes: form.notes.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit asset" : "Add asset"}</DialogTitle>
          <DialogDescription>Track non-market savings, deposits and assets.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="ast-name">Asset name</Label>
            <Input
              id="ast-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Public Provident Fund"
            />
          </div>
          <div className="grid gap-2">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSET_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ast-inst">Institution</Label>
            <Input
              id="ast-inst"
              value={form.institution}
              onChange={(e) => set("institution", e.target.value)}
              placeholder="SBI"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ast-inv">Invested / deposited (₹)</Label>
            <Input
              id="ast-inv"
              inputMode="decimal"
              value={form.invested}
              onChange={(e) => set("invested", e.target.value)}
              placeholder="250000"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ast-cur">Current value (₹)</Label>
            <Input
              id="ast-cur"
              inputMode="decimal"
              value={form.currentValue}
              onChange={(e) => set("currentValue", e.target.value)}
              placeholder="Defaults to invested"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ast-mat">Maturity date</Label>
            <Input
              id="ast-mat"
              type="date"
              value={form.maturityDate}
              onChange={(e) => set("maturityDate", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ast-int">Interest / return (%)</Label>
            <Input
              id="ast-int"
              inputMode="decimal"
              value={form.interestRate}
              onChange={(e) => set("interestRate", e.target.value)}
              placeholder="7.1"
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="ast-notes">Notes</Label>
            <Textarea
              id="ast-notes"
              rows={2}
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
          <Button onClick={submit}>{initial ? "Save changes" : "Add asset"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
