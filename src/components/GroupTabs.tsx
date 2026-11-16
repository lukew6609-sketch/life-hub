import Link from "next/link";
import { money } from "@/lib/money";

/** Household / Personal / Rental / All tabs with a monthly total on each. */
export default function GroupTabs({ base, current, totals, extra = "" }: { base: string; current: string; totals: Record<string, number>; extra?: string }) {
  const tabs = [
    ["household", "Household"],
    ["personal", "Personal"],
    ["rental", "Rental property"],
    ["all", "All"],
  ];
  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {tabs.map(([key, label]) => (
        <Link
          key={key}
          href={`${base}?group=${key}${extra}`}
          className={`rounded-xl border px-3 py-2 text-sm ${current === key ? "bg-emerald-700 text-white border-emerald-700" : "bg-white border-stone-200 hover:bg-stone-50"}`}
        >
          <span className="font-medium">{label}</span>
          <span className={`ml-2 tabular-nums ${current === key ? "text-emerald-100" : "text-stone-500"}`}>{money(totals[key] ?? 0, true)}/mo</span>
        </Link>
      ))}
    </div>
  );
}
