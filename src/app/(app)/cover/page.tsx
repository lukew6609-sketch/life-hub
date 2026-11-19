import Link from "next/link";
import { FileText, HeartPulse, Phone, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { coverTypeLabel, frequencyLabel } from "@/lib/fields";
import { fmtDate, money, monthly } from "@/lib/money";
import RecordForm from "@/components/RecordForm";
import DeleteButton from "@/components/DeleteButton";
import Uploader from "@/components/Uploader";
import { Card, DueBadge, Empty, PageHeader, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

type Policy = {
  id: string;
  commitment_id: string | null;
  name: string;
  insurer: string | null;
  policy_number: string | null;
  cover_type: string;
  people_covered: string | null;
  life_cover: number | null;
  ci_cover: number | null;
  monthly_benefit: number | null;
  cover_basis: string | null;
  start_date: string | null;
  end_date: string | null;
  premium: number | null;
  premium_frequency: string | null;
  in_trust: boolean | null;
  beneficiaries: string | null;
  claims_phone: string | null;
  status: "active" | "claimed" | "ended";
  details: { label: string; value: string }[];
  notes: string | null;
};

const STATUS = {
  active: { label: "Active", cls: "bg-emerald-50 text-emerald-700" },
  claimed: { label: "Claimed", cls: "bg-amber-50 text-amber-700" },
  ended: { label: "Ended", cls: "bg-stone-100 text-stone-600" },
};

function Amount({ label, value, suffix }: { label: string; value: number | null; suffix?: string }) {
  return (
    <div>
      <p className="text-xs text-stone-500">{label}</p>
      <p className="num text-2xl">{value === null ? <span className="text-stone-400 text-base font-semibold">Not known yet</span> : <>{money(value, true)}{suffix && <span className="text-sm text-stone-500 font-normal">{suffix}</span>}</>}</p>
    </div>
  );
}

export default async function Cover() {
  const { supabase } = await requireUser();
  const [{ data }, { data: docs }] = await Promise.all([
    supabase.from("protection").select("*").order("status").order("name"),
    supabase.from("documents").select("id, title, commitment_id, status").not("commitment_id", "is", null),
  ]);
  const list = (data ?? []) as Policy[];
  const active = list.filter((p) => p.status === "active");
  const lifeTotal = active.reduce((s, p) => s + Number(p.life_cover ?? 0), 0);
  const ciTotal = active.reduce((s, p) => s + Number(p.ci_cover ?? 0), 0);
  const incomeTotal = active.reduce((s, p) => s + Number(p.monthly_benefit ?? 0), 0);
  const cost = active.reduce((s, p) => s + monthly(p.premium, p.premium_frequency), 0);
  const unknown = active.filter((p) => p.life_cover === null && p.ci_cover === null && p.monthly_benefit === null).length;
  const linkable = list.filter((p) => p.commitment_id).map((p) => ({ id: p.commitment_id!, label: p.name }));

  return (
    <div className="space-y-6">
      <PageHeader title="Life cover" subtitle="What you're covered for, who's covered and who gets paid">
        <RecordForm table="protection" label="Add policy" title="Add a life / protection policy" defaults={{ status: "active", premium_frequency: "monthly", in_trust: false }} />
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Life cover" value={lifeTotal ? money(lifeTotal, true) : "—"} sub="paid out on death" />
        <Stat label="Critical illness cover" value={ciTotal ? money(ciTotal, true) : "—"} />
        <Stat label="Income cover" value={incomeTotal ? `${money(incomeTotal, true)}/mo` : "—"} />
        <Stat label="Costs" value={`${money(cost)}/mo`} sub={`${active.length} active ${active.length === 1 ? "policy" : "policies"}`} />
      </div>

      <Card title="Add your policy documents">
        <p className="text-sm text-stone-500 mb-4">
          Upload policy schedules, key facts or claim letters. Pick which policy each one belongs to and the AI fills in the cover amounts, who&apos;s covered, the end date, trust details and the claims number.
          {unknown > 0 && ` ${unknown} ${unknown === 1 ? "policy is" : "policies are"} still missing cover details.`}
        </p>
        <Uploader bills={linkable} cars={[]} />
      </Card>

      {list.length === 0 ? (
        <Empty>No policies yet.</Empty>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {list.map((p) => {
            const pDocs = (docs ?? []).filter((d) => p.commitment_id && d.commitment_id === p.commitment_id);
            const facts: [string, React.ReactNode][] = [
              ["Who's covered", p.people_covered],
              ["Cover basis", p.cover_basis],
              ["Started", p.start_date && fmtDate(p.start_date)],
              ["Cover ends", p.end_date && <DueBadge date={p.end_date} />],
              ["Premium", p.premium !== null && `${money(p.premium)} ${frequencyLabel(p.premium_frequency).toLowerCase()}`],
              ["In trust", p.in_trust === null ? null : p.in_trust ? "Yes" : "No"],
              ["Who gets paid", p.beneficiaries],
              ["Policy number", p.policy_number && <span className="font-mono text-sm">{p.policy_number}</span>],
            ];
            return (
              <Card key={p.id} className={p.status === "active" ? "" : "opacity-75"}>
                <div className="flex items-start gap-3">
                  <span className="inline-grid place-items-center rounded-xl h-11 w-11 shrink-0" style={{ background: "#ff9fc41f", color: "#ff9fc4", boxShadow: "inset 0 0 0 1px #ff9fc433" }}>
                    <HeartPulse size={22} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-lg">{p.name}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span>
                    </div>
                    <p className="text-sm text-stone-500">{[p.insurer, coverTypeLabel(p.cover_type)].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="flex">
                    <RecordForm table="protection" record={p} variant="icon" title={`Edit ${p.name}`} />
                    <DeleteButton table="protection" id={p.id} what={p.name} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-5">
                  {(p.cover_type === "income_protection" || p.cover_type === "family_income") ? (
                    <Amount label="Monthly benefit" value={p.monthly_benefit} suffix="/mo" />
                  ) : (
                    <>
                      <Amount label="Life cover" value={p.life_cover} />
                      <Amount label="Critical illness" value={p.ci_cover} />
                    </>
                  )}
                </div>

                <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm mt-5">
                  {facts
                    .filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== false)
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-xs text-stone-500">{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                </dl>

                {p.details?.length > 0 && (
                  <details className="mt-4">
                    <summary className="text-sm text-emerald-700 cursor-pointer">More from the documents ({p.details.length})</summary>
                    <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mt-3">
                      {p.details.map((f, i) => (
                        <div key={i}>
                          <dt className="text-xs text-stone-500">{f.label}</dt>
                          <dd className="break-words">{f.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}

                {p.notes && <p className="text-sm text-stone-600 mt-4 bg-stone-50 rounded-xl p-3">{p.notes}</p>}

                <div className="flex flex-wrap items-center gap-2 mt-4">
                  {p.claims_phone && (
                    <a href={`tel:${p.claims_phone.replace(/\s/g, "")}`} className="btn-ghost">
                      <Phone size={15} /> Claims: {p.claims_phone}
                    </a>
                  )}
                  {pDocs.map((d) => (
                    <Link key={d.id} href={`/documents/${d.id}`} className="btn-ghost">
                      <FileText size={15} /> {d.title}
                    </Link>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {active.some((p) => p.in_trust === false) && (
        <Card>
          <p className="text-sm text-stone-600 flex gap-2">
            <ShieldCheck size={18} className="text-emerald-700 shrink-0 mt-0.5" />
            A policy that isn&apos;t written in trust normally pays out into your estate, which can mean waiting for probate and, in some cases, inheritance tax. Most insurers let you put a policy in trust for free. Worth asking about.
          </p>
        </Card>
      )}
    </div>
  );
}
