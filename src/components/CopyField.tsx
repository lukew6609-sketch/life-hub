"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyField({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="flex gap-2">
      <input readOnly value={value} className="input font-mono text-xs" onFocus={(e) => e.target.select()} />
      <button type="button" className="btn-ghost" onClick={() => { navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1500); }}>
        {ok ? <Check size={15} /> : <Copy size={15} />}
      </button>
    </div>
  );
}
