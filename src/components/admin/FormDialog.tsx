import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, selectClass } from "@/components/common";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "number" | "select" | "textarea" | "date" | "checkbox" | "url";
  options?: { value: string; label: string }[];
  required?: boolean;
  full?: boolean;
};
type Values = Record<string, any>;

/** Generic create/edit modal. Empty strings are dropped so the backend's optional fields stay unset. */
export function FormDialog({
  open,
  onOpenChange,
  title,
  fields,
  initial,
  onSubmit,
  busy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  fields: FieldDef[];
  initial?: Values;
  onSubmit: (v: Values) => void;
  busy?: boolean;
}) {
  const [v, setV] = useState<Values>({});
  useEffect(() => {
    if (open) setV(initial ?? {});
  }, [open, initial]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const out: Values = {};
    for (const f of fields) {
      const raw = v[f.name];
      if (f.type === "checkbox") out[f.name] = !!raw;
      else if (raw === "" || raw === undefined || raw === null) continue;
      else if (f.type === "number") out[f.name] = Number(raw);
      else if (f.type === "date") out[f.name] = new Date(`${raw}T00:00:00`).toISOString();
      else out[f.name] = typeof raw === "string" ? raw.trim() : raw;
    }
    onSubmit(out);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => {
              const val = v[f.name] ?? "";
              const set = (x: unknown) => setV((p) => ({ ...p, [f.name]: x }));
              return (
                <div
                  key={f.name}
                  className={f.full || f.type === "textarea" ? "sm:col-span-2" : ""}
                >
                  {f.type === "checkbox" ? (
                    <label className="flex items-center gap-2 pt-6 text-sm">
                      <Checkbox checked={!!v[f.name]} onCheckedChange={(c) => set(!!c)} />
                      {f.label}
                    </label>
                  ) : (
                    <Field label={f.label + (f.required ? " *" : "")}>
                      {f.type === "select" ? (
                        <select
                          className={selectClass}
                          required={f.required}
                          value={val}
                          onChange={(e) => set(e.target.value)}
                        >
                          <option value="">Select…</option>
                          {f.options?.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ) : f.type === "textarea" ? (
                        <Textarea
                          rows={3}
                          required={f.required}
                          value={val}
                          onChange={(e) => set(e.target.value)}
                        />
                      ) : (
                        <Input
                          type={
                            f.type === "number"
                              ? "number"
                              : f.type === "date"
                                ? "date"
                                : f.type === "url"
                                  ? "url"
                                  : "text"
                          }
                          required={f.required}
                          value={f.type === "date" && val ? String(val).slice(0, 10) : val}
                          onChange={(e) => set(e.target.value)}
                        />
                      )}
                    </Field>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const opts = (arr: readonly string[], label: (s: string) => string = (s) => s) =>
  arr.map((value) => ({ value, label: label(value) }));
