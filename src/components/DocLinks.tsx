"use client";

import { useTransition } from "react";
import { linkDocument } from "@/lib/actions";

type Opt = { id: string; label: string };
type Field = "commitment_id" | "vehicle_id" | "warranty_id";

export default function DocLinks({ id, current, bills, cars, warranties }: { id: string; current: Record<Field, string | null>; bills: Opt[]; cars: Opt[]; warranties: Opt[] }) {
  const [pending, start] = useTransition();
  const rows: [Field, string, Opt[]][] = [
    ["commitment_id", "Bill / policy", bills],
    ["vehicle_id", "Car", cars],
    ["warranty_id", "Warranty", warranties],
  ];
  return (
    <div className={`space-y-2 ${pending ? "opacity-60" : ""}`}>
      {rows.map(([field, label, opts]) => (
        <div key={field}>
          <label className="label">{label}</label>
          <select className="input" defaultValue={current[field] ?? ""} onChange={(e) => start(() => linkDocument(id, field, e.target.value || null))}>
            <option value="">—</option>
            {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}
