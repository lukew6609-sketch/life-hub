import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/fields";
import { daysUntil, fmtDate, money, monthly, ordinal, relDays } from "@/lib/money";
import { CatIcon, catStyle } from "@/lib/categories";
import RecordForm from "@/components/RecordForm";
import GroupTabs from "@/components/GroupTabs";
import { Empty, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const PER: Record<string, string> = { weekly: "/wk", fortnightly: "/2wk", four_weekly: "/4wk", monthly: "/mo", quarterly: "/qtr", six_monthly: "/6mo", annually: "/yr", one_off: "" };

function RenewChip({ date }: { date: string }) {
  const n = daysUntil(date);
  const tone = n < 0 ? "bg-red-50 text-red-700" : n <= 45 ? "bg-amber-50 text-amber-700" : "bg-stone-100 text-stone-600";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${tone}`} title={fmtDate(date)}>
      {n <= 60 ? `Renews ${relDays(n)}` : `Renews ${fmtDate(date)}`}
    </span>
  );
}

export default async function Bills({ searchParams }: { searchParams: Promise<{ show?: string; group?: string }> }) {
  const { show, group = "household" } = await searchParams;
  const { supabase } = await requireUser();
  let q = supabase.from("commitments").select("*").order("name");
  if (show !== "all") q = q.eq("active", true);
  const { data: bills } = await q;
  const everything = bills ?? [];
  const totals: Record<string, number> = { all: 0 };
  for (const b of everything.filter((x) => x.active)) {
    const m = monthly(b.amount, b.frequency);
    totals[b.bill_group] = (totals[b.bill_group] ?? 0) + m;
    totals.all += m;
  }
  const list = group === "all" ? everything : everything.filter((b) => b.bill_group === group);
  const total = list.filter((b) => b.active).reduce((s, b) => s + monthly(b.amount, b.frequency), 0);

  const sections = CATEGORIES.map((c) => ({ ...c, items: list.filter((b) => b.category === c.value).sort((a, b) => monthly(b.amount, b.frequency) - monthly(a.amount, a.frequency)) }))
    .filter((g) => g.items.length)
    .map((g) => ({ ...g, sub: g.items.filter((b) => b.active).reduce((s, b) => s + monthly(b.amount, b.frequency), 0) }))
    .sort((a, b) => b.sub - a.sub);

  return (
    <div>
      <PageHeader title="Bills & renewals" subtitle={`${money(total)} a month · ${money(total * 12, true)} a year`}>
        <Link href={show === "all" ? `/bills?group=${group}` : `/bills?group=${group}&show=all`} className="btn-ghost">
          {show === "all" ? "Hide cancelled" : "Show cancelled"}
        </Link>
        <RecordForm table="commitments" label="Add bill" title="Add a bill, subscription or policy" defaults={{ bill_group: group === "all" ? "household" : group }} />
      </PageHeader>

      <GroupTabs base="/bills" current={group} totals={totals} extra={show === "all" ? "&show=all" : ""} />

      {sections.length === 0 ? (
        <Empty>No bills in this group yet.</Empty>
      ) : (
        <div className="space-y-8">
          {sections.map((s) => (
            <section key={s.value}>
              <div className="flex items-center gap-3 mb-2 px-1">
                <span className="h-2 w-2 rounded-full" style={{ background: catStyle(s.value).color }} />
                <h2 className="font-semibold">{s.label}</h2>
                <span className="text-sm text-stone-500 ml-auto">{money(s.sub)}/mo</span>
              </div>
              <ul className="rounded-2xl border border-stone-200 bg-white divide-y divide-stone-200/70 overflow-hidden">
                {s.items.map((b) => (
                  <li key={b.id} className={b.active ? "" : "opacity-50"}>
                    <Link href={`/bills/${b.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-stone-50 transition-colors">
                      <CatIcon category={b.category} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{b.name}</p>
                        <p className="text-sm text-stone-500 truncate">
                          {[b.provider, b.payment_day ? `${ordinal(b.payment_day)} of the month` : null, !b.active ? "cancelled" : null].filter(Boolean).join(", ")}
                        </p>
                      </div>
                      <div className="hidden sm:block">{b.end_date && <RenewChip date={b.end_date} />}</div>
                      <div className="text-right shrink-0">
                        <p className="num text-lg leading-tight">
                          {b.amount === null ? "—" : money(b.amount)}
                          <span className="text-xs font-normal text-stone-500 ml-0.5">{PER[b.frequency] ?? ""}</span>
                        </p>
                        {b.frequency !== "monthly" && b.amount !== null && <p className="text-xs text-stone-500">{money(monthly(b.amount, b.frequency))}/mo</p>}
                        {b.end_date && <div className="sm:hidden mt-1"><RenewChip date={b.end_date} /></div>}
                      </div>
                      <ChevronRight size={16} className="text-stone-400 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
