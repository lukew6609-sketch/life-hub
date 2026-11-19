"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Opt = { id: string; label: string };

export default function Uploader({ bills, cars, linkBill, linkCar }: { bills: Opt[]; cars: Opt[]; linkBill?: string; linkCar?: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [bill, setBill] = useState(linkBill ?? "");
  const [car, setCar] = useState(linkCar ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload() {
    if (!files.length) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let done = 0;
    for (const f of files) {
      setStatus(`Uploading ${f.name} (${done + 1}/${files.length})…`);
      const safe = f.name.replace(/[^\w.\-]+/g, "_");
      const path = `${user.id}/${crypto.randomUUID()}-${safe}`;
      const up = await supabase.storage.from("documents").upload(path, f, { contentType: f.type || undefined });
      if (up.error) {
        setStatus(`Upload failed: ${up.error.message}`);
        return;
      }
      const { data: doc, error } = await supabase
        .from("documents")
        .insert({ title: f.name.replace(/\.[^.]+$/, ""), storage_path: path, mime_type: f.type, size_bytes: f.size, commitment_id: bill || null, vehicle_id: car || null })
        .select("id")
        .single();
      if (error || !doc) {
        setStatus(`Save failed: ${error?.message}`);
        return;
      }
      setStatus(`Reading ${f.name} with AI…`);
      router.refresh();
      await fetch("/api/documents/process", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: doc.id }) });
      done++;
    }
    setFiles([]);
    setStatus(`Done: ${done} document${done === 1 ? "" : "s"} filed.`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); setFiles([...e.dataTransfer.files]); }}
        onClick={() => input.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${drag ? "border-emerald-500 bg-emerald-50" : "border-stone-300 hover:bg-stone-50"}`}
      >
        <UploadCloud className="mx-auto text-stone-400" />
        <p className="text-sm mt-2">{files.length ? files.map((f) => f.name).join(", ") : "Drop PDFs or photos here, or tap to choose"}</p>
        <p className="text-xs text-stone-500">Policy schedules, bills, receipts, MOT certificates, letters… The AI reads them and pulls out the dates, prices and numbers.</p>
        <input ref={input} type="file" multiple accept="application/pdf,image/*" className="hidden" onChange={(e) => setFiles([...(e.target.files ?? [])])} />
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        <select className="input" value={bill} onChange={(e) => setBill(e.target.value)}>
          <option value="">Link to a bill (optional)</option>
          {bills.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
        {cars.length > 0 ? (
          <select className="input" value={car} onChange={(e) => setCar(e.target.value)}>
            <option value="">Link to a car (optional)</option>
            {cars.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        ) : (
          <div className="hidden sm:block" />
        )}
        <button className="btn justify-center" disabled={!files.length || (!!status && status.endsWith("…"))} onClick={upload}>
          Upload {files.length ? `(${files.length})` : ""}
        </button>
      </div>
      {status && <p className="text-sm text-stone-600">{status}</p>}
    </div>
  );
}
