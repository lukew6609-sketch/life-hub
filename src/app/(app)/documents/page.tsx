import Link from "next/link";
import { FileText, Image as ImageIcon, Loader2, AlertCircle } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/money";
import Uploader from "@/components/Uploader";
import { Card, Empty, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  insurance: "Insurance", warranty: "Warranty", receipt: "Receipt", utility_bill: "Utility bill", energy_bill: "Energy bill", phone_broadband: "Phone / broadband",
  subscription: "Subscription", mot: "MOT", vehicle_tax: "Car tax", v5c: "V5C", car_finance: "Car finance", bank_statement: "Bank statement", payslip: "Payslip",
  tax: "Tax", medical: "Medical", contract: "Contract", manual: "Manual", id_document: "ID", letter: "Letter", other: "Other",
};

export default async function Documents({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; link?: string; car?: string }> }) {
  const { q, type, link, car } = await searchParams;
  const { supabase } = await requireUser();
  let query = supabase.from("documents").select("id, title, doc_type, provider, reference, end_date, status, mime_type, created_at, summary").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.textSearch("search", q, { type: "websearch", config: "english" });
  if (type) query = query.eq("doc_type", type);
  const [{ data: docs }, { data: bills }, { data: cars }] = await Promise.all([
    query,
    supabase.from("commitments").select("id, name").order("name"),
    supabase.from("vehicles").select("id, registration"),
  ]);
  const types = [...new Set((docs ?? []).map((d) => d.doc_type).filter(Boolean))] as string[];

  return (
    <div className="space-y-6">
      <PageHeader title="Documents" subtitle="Everything you might need to find again" />
      <Card>
        <Uploader bills={(bills ?? []).map((b) => ({ id: b.id, label: b.name }))} cars={(cars ?? []).map((c) => ({ id: c.id, label: c.registration }))} linkBill={link} linkCar={car} />
      </Card>

      <form className="flex gap-2">
        <input name="q" defaultValue={q} className="input" placeholder="Search inside all your documents…" />
        <button className="btn-ghost">Search</button>
      </form>
      {types.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <Link href="/documents" className={`pill ${!type ? "bg-emerald-700 text-white" : ""}`}>All</Link>
          {types.map((t) => (
            <Link key={t} href={`/documents?type=${t}`} className={`pill ${type === t ? "bg-emerald-700 text-white" : ""}`}>{TYPE_LABEL[t] ?? t}</Link>
          ))}
        </div>
      )}

      {(docs ?? []).length === 0 ? (
        <Empty>{q ? "Nothing matched that search." : "No documents yet."}</Empty>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {docs!.map((d) => (
            <Link key={d.id} href={`/documents/${d.id}`} className="card hover:border-emerald-300 transition flex gap-3">
              <div className="h-10 w-10 shrink-0 rounded-lg bg-stone-100 grid place-items-center text-stone-500">
                {d.status === "processing" ? <Loader2 size={18} className="animate-spin" /> : d.status === "error" ? <AlertCircle size={18} className="text-red-500" /> : d.mime_type?.startsWith("image/") ? <ImageIcon size={18} /> : <FileText size={18} />}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{d.title}</p>
                <p className="text-xs text-stone-500 truncate">
                  {[d.doc_type && (TYPE_LABEL[d.doc_type] ?? d.doc_type), d.provider, d.reference, d.end_date && `ends ${fmtDate(d.end_date)}`].filter(Boolean).join(" · ") || (d.status === "processing" ? "Reading…" : "")}
                </p>
                {d.summary && <p className="text-xs text-stone-600 mt-1 line-clamp-2">{d.summary}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
