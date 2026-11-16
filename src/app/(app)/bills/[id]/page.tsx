import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { categoryLabel, frequencyLabel } from "@/lib/fields";
import { fmtDate, money, priceTrend, yearly } from "@/lib/money";
import RecordForm from "@/components/RecordForm";
import DeleteButton from "@/components/DeleteButton";
import { Card, DueBadge, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Bill({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const [{ data: b }, { data: history }, { data: docs }, { data: cars }] = await Promise.all([
    supabase.from("commitments").select("*").eq("id", id).maybeSingle(),
    supabase.from("price_history").select("*").eq("commitment_id", id).order("effective_date"),
    supabase.from("documents").select("id, title, doc_type, created_at").eq("commitment_id", id).order("created_at", { ascending: false }),
    supabase.from("vehicles").select("id, registration"),
  ]);
  if (!b) notFound();
  const trend = priceTrend(history ?? []);
  const car = cars?.find((c) => c.id === b.vehicle_id);

  const facts: [string, React.ReactNode][] = [
    ["Provider", b.provider],
    ["Category", categoryLabel(b.category)],
    ["Amount", `${money(b.amount)} ${frequencyLabel(b.frequency).toLowerCase()}`],
    ["Yearly cost", money(yearly(b.amount, b.frequency))],
    ["Payment day", b.payment_day],
    ["Paid by", b.payment_method],
    ["Policy / account no.", b.reference ? <span className="font-mono">{b.reference}</span> : null],
    ["Started", fmtDate(b.start_date)],
    ["Renews / ends", <DueBadge key="d" date={b.end_date} />],
    ["Auto-renews", b.auto_renews ? "Yes" : "No"],
    ["Car", car?.registration],
    ["Phone", b.phone ? <a href={`tel:${b.phone}`} className="text-emerald-700">{b.phone}</a> : null],
    ["Website", b.website ? <a href={b.website.startsWith("http") ? b.website : `https://${b.website}`} target="_blank" className="text-emerald-700 inline-flex items-center gap-1">{b.website} <ExternalLink size={12} /></a> : null],
  ];

  return (
    <div>
      <Link href="/bills" className="text-sm text-stone-500 inline-flex items-center gap-1 mb-3">
        <ArrowLeft size={14} /> Bills
      </Link>
      <PageHeader title={b.name} subtitle={b.active ? undefined : "Cancelled / no longer paying"}>
        <RecordForm table="commitments" record={b} title={`Edit ${b.name}`} />
        <DeleteButton table="commitments" id={b.id} what={b.name} after="/bills" />
      </PageHeader>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" title="Details">
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {facts
              .filter(([, v]) => v !== null && v !== undefined && v !== "")
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-stone-500">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
          {b.notes && <p className="text-sm mt-4 whitespace-pre-wrap bg-stone-50 rounded-lg p-3">{b.notes}</p>}
        </Card>

        <div className="space-y-6">
          <Card title="Price history" action={<RecordForm table="price_history" variant="ghost" label="Add" title="Add a past price" hidden={{ commitment_id: b.id }} defaults={{ frequency: b.frequency }} />}>
            {trend && (
              <div className={`rounded-lg p-3 mb-3 text-sm ${trend.avgPct > 3 ? "bg-amber-50" : "bg-emerald-50"}`}>
                <p className="font-medium">
                  {trend.avgPct >= 0 ? "Up" : "Down"} {Math.abs(trend.avgPct).toFixed(1)}% a year on average
                </p>
                <p className="text-xs text-stone-600">
                  {money(trend.first.yearly)}/yr → {money(trend.last.yearly)}/yr ({trend.totalPct >= 0 ? "+" : ""}
                  {trend.totalPct.toFixed(0)}% overall)
                </p>
              </div>
            )}
            <ul className="text-sm divide-y divide-stone-100">
              {(history ?? []).map((h) => (
                <li key={h.id} className="py-1.5 flex justify-between gap-2">
                  <span className="text-stone-600">{fmtDate(h.effective_date)}</span>
                  <span className="tabular-nums">
                    {money(h.amount)} <span className="text-xs text-stone-500">{frequencyLabel(h.frequency).toLowerCase()}</span>
                  </span>
                  <DeleteButton table="price_history" id={h.id} what="this price" />
                </li>
              ))}
            </ul>
            {(history ?? []).length < 2 && <p className="text-xs text-stone-500 mt-2">Add last year&apos;s price (from an old renewal letter) to see how much it&apos;s going up.</p>}
          </Card>

          <Card title="Documents" action={<Link href={`/documents?link=${b.id}`} className="btn-ghost">Upload</Link>}>
            {(docs ?? []).length === 0 ? (
              <p className="text-sm text-stone-500">None linked yet.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {docs!.map((d) => (
                  <li key={d.id}>
                    <Link href={`/documents/${d.id}`} className="flex items-center gap-2 hover:text-emerald-700">
                      <FileText size={15} /> {d.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
