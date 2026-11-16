import Link from "next/link";
import { FileText, Upload } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { money, yearly } from "@/lib/money";
import RecordForm from "@/components/RecordForm";
import DeleteButton from "@/components/DeleteButton";
import { Card, DueBadge, Empty, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Cars() {
  const { supabase } = await requireUser();
  const [{ data: cars }, { data: bills }, { data: docs }] = await Promise.all([
    supabase.from("vehicles").select("*").order("registration"),
    supabase.from("commitments").select("id, name, amount, frequency, end_date, vehicle_id").not("vehicle_id", "is", null),
    supabase.from("documents").select("id, title, vehicle_id, doc_type").not("vehicle_id", "is", null),
  ]);

  return (
    <div>
      <PageHeader title="Cars" subtitle="MOT, tax and service dates show on the dashboard when they're due">
        <RecordForm table="vehicles" label="Add car" title="Add a car" />
      </PageHeader>

      {(cars ?? []).length === 0 ? (
        <Empty>No cars yet. Add one, then upload the MOT certificate, V5C or insurance docs.</Empty>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {cars!.map((c) => {
            const linked = (bills ?? []).filter((b) => b.vehicle_id === c.id);
            const carDocs = (docs ?? []).filter((d) => d.vehicle_id === c.id);
            return (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block font-mono font-bold bg-yellow-300 border border-yellow-500 rounded px-2 py-0.5 tracking-wider">{c.registration}</span>
                    <p className="text-sm text-stone-600 mt-1.5">{[c.year, c.colour, c.make, c.model].filter(Boolean).join(" ")}</p>
                  </div>
                  <div className="flex">
                    <RecordForm table="vehicles" record={c} variant="icon" title={`Edit ${c.registration}`} />
                    <DeleteButton table="vehicles" id={c.id} what={c.registration} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
                  {[
                    ["MOT", c.mot_due],
                    ["Tax", c.tax_due],
                    ["Service", c.service_due],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-stone-50 rounded-lg p-2.5">
                      <p className="text-xs text-stone-500">{k}</p>
                      <div className="text-xs mt-0.5"><DueBadge date={v} /></div>
                    </div>
                  ))}
                </div>
                {linked.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-stone-500 mb-1">Insurance, finance & breakdown</p>
                    {linked.map((b) => (
                      <Link key={b.id} href={`/bills/${b.id}`} className="flex justify-between text-sm py-1 hover:text-emerald-700">
                        <span>{b.name}</span>
                        <span className="tabular-nums text-stone-600">{money(yearly(b.amount, b.frequency), true)}/yr</span>
                      </Link>
                    ))}
                  </div>
                )}
                <div className="mt-4">
                  <p className="text-xs text-stone-500 mb-1">Documents</p>
                  {carDocs.map((d) => (
                    <Link key={d.id} href={`/documents/${d.id}`} className="flex items-center gap-2 text-sm py-1 hover:text-emerald-700">
                      <FileText size={14} /> {d.title}
                    </Link>
                  ))}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Link href={`/documents?car=${c.id}`} className="btn-ghost"><Upload size={15} /> Upload MOT / tax / V5C</Link>
                    <RecordForm table="commitments" variant="ghost" label="Add insurance" title={`Add a bill for ${c.registration}`} hidden={{ vehicle_id: c.id }} defaults={{ category: "car", name: `${c.registration} insurance`, frequency: "annually" }} />
                  </div>
                </div>
                {c.notes && <p className="text-sm mt-3 text-stone-600 whitespace-pre-wrap">{c.notes}</p>}
              </Card>
            );
          })}
        </div>
      )}
      <p className="text-xs text-stone-500 mt-4">
        Tip: check your MOT history and tax status for free at{" "}
        <a className="text-emerald-700" href="https://www.check-mot.service.gov.uk/" target="_blank">check-mot.service.gov.uk</a> and{" "}
        <a className="text-emerald-700" href="https://www.gov.uk/check-vehicle-tax" target="_blank">gov.uk/check-vehicle-tax</a>.
      </p>
    </div>
  );
}
