"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export default function Reprocess({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button
      className="btn-ghost"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/documents/process", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
        setBusy(false);
        router.refresh();
      }}
    >
      <RefreshCw size={15} className={busy ? "animate-spin" : ""} /> {busy ? "Reading…" : "Re-read"}
    </button>
  );
}
