import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { fmtDate, money } from "@/lib/money";
import { frequencyLabel } from "@/lib/fields";
import { createFromDocument } from "@/lib/actions";
import DeleteButton from "@/components/DeleteButton";
import ActionButton from "@/components/ActionButton";
import DocLinks from "@/components/DocLinks";
import Reprocess from "@/components/Reprocess";
import { Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Doc({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: d } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
  if (!d) notFound();
  const [{ data: signed }, { data: bills }, { data: cars }, { data: warranties }] = await Promise.all([
    supabase.storage.from("documents").createSignedUrl(d.storage_path, 60 * 30),
    supabase.from("commitments").select("id, name").order("name"),
    supabase.from("vehicles").select("id, registration"),
    supabase.from("warranties").select("id, item"),
  ]);
  const facts = (d.key_facts ?? []) as { label: string; value: string }[];
  const isEnergy = d.energy && (d.energy.unit_rate_p || d.energy.standing_charge_p);
  const canCreate = d.status === "ready" && !d.commitment_id && (isEnergy || d.amount || d.end_date);

  return (
    <div>
      <Link href="/documents" className="text-sm text-stone-500 inline-flex items-center gap-1 mb-3"><ArrowLeft size={14} /> Documents</Link>
      <PageHeader title={d.title} subtitle={[d.provider, d.doc_type?.replace(/_/g, " ")].filter(Boolean).join(" · ")}>
        {signed?.signedUrl && <a href={signed.signedUrl} target="_blank" className="btn-ghost"><ExternalLink size={15} /> Open file</a>}
        <Reprocess id={d.id} />
        <DeleteButton table="documents" id={d.id} what="this document" after="/documents" />
      </PageHeader>

      {d.status === "processing" && <p className="card text-sm mb-4">Still reading this document… refresh in a few seconds.</p>}
      {d.status === "error" && <p className="card text-sm mb-4 text-red-600">Couldn&apos;t read this document: {d.error}. Try “Re-read”.</p>}

      {canCreate && (
        <div className="card mb-6 bg-emerald-50/60 border-emerald-200 flex flex-wrap items-center gap-3">
          <Sparkles className="text-emerald-700" size={18} />
          <p className="text-sm flex-1">{isEnergy ? "This looks like an energy bill. Save the rates to Gas & electric?" : "Track this as a bill / renewal so it shows on your dashboard?"}</p>
          <ActionButton action={createFromDocument.bind(null, d.id)} className="btn">{isEnergy ? "Save tariff" : "Create bill"}</ActionButton>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {d.summary && <Card title="Summary"><p className="text-sm whitespace-pre-wrap">{d.summary}</p></Card>}
          {facts.length > 0 && (
            <Card title="Key details">
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                {facts.map((f, i) => (
                  <div key={i}>
                    <dt className="text-xs text-stone-500">{f.label}</dt>
                    <dd className="break-words">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
          {d.extracted_text && (
            <details className="card">
              <summary className="cursor-pointer text-sm font-medium">Full text</summary>
              <pre className="text-xs whitespace-pre-wrap mt-3 max-h-[60vh] overflow-y-auto font-sans text-stone-700">{d.extracted_text}</pre>
            </details>
          )}
        </div>
        <div className="space-y-6">
          <Card title="At a glance">
            <dl className="space-y-2 text-sm">
              {[
                ["Reference", d.reference],
                ["Starts", d.start_date && fmtDate(d.start_date)],
                ["Ends / renews", d.end_date && fmtDate(d.end_date)],
                ["Cost", d.amount && `${money(d.amount)} ${frequencyLabel(d.amount_frequency).toLowerCase()}`],
                ["Uploaded", fmtDate(d.created_at.slice(0, 10))],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-2"><dt className="text-stone-500">{k}</dt><dd className="text-right break-all">{v}</dd></div>
              ))}
            </dl>
          </Card>
          <Card title="Linked to">
            <DocLinks
              id={d.id}
              current={{ commitment_id: d.commitment_id, vehicle_id: d.vehicle_id, warranty_id: d.warranty_id }}
              bills={(bills ?? []).map((b) => ({ id: b.id, label: b.name }))}
              cars={(cars ?? []).map((c) => ({ id: c.id, label: c.registration }))}
              warranties={(warranties ?? []).map((w) => ({ id: w.id, label: w.item }))}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
