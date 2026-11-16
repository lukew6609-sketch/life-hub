"use client";

import { useState } from "react";

type Current = { unit: number; standing: number; usage: number } | null;

const cost = (unitP: number, standingP: number, kwh: number) => (unitP * kwh + standingP * 365) / 100;
const gbp = (n: number) => n.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

/** Compare a quote against the current tariff on an annual basis. */
export default function EnergyCompare({ fuel, current }: { fuel: string; current: Current }) {
  const [usage, setUsage] = useState(String(current?.usage || (fuel === "gas" ? 11500 : 2700)));
  const [unit, setUnit] = useState("");
  const [standing, setStanding] = useState("");
  const kwh = Number(usage) || 0;
  const now = current ? cost(current.unit, current.standing, kwh) : null;
  const quote = unit && standing ? cost(Number(unit), Number(standing), kwh) : null;
  const diff = now !== null && quote !== null ? quote - now : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="label">Yearly kWh</label>
          <input className="input" inputMode="decimal" value={usage} onChange={(e) => setUsage(e.target.value)} />
        </div>
        <div>
          <label className="label">Quote unit p/kWh</label>
          <input className="input" inputMode="decimal" value={unit} onChange={(e) => setUnit(e.target.value)} />
        </div>
        <div>
          <label className="label">Quote standing p/day</label>
          <input className="input" inputMode="decimal" value={standing} onChange={(e) => setStanding(e.target.value)} />
        </div>
      </div>
      <div className="text-sm bg-stone-50 rounded-lg p-3 space-y-1">
        <p>Current tariff: {now !== null ? <b>{gbp(now)}/yr</b> : <span className="text-stone-500">add your unit rate & standing charge</span>}</p>
        {quote !== null && <p>Quote: <b>{gbp(quote)}/yr</b></p>}
        {diff !== null && (
          <p className={diff < 0 ? "text-emerald-700 font-medium" : "text-red-600 font-medium"}>
            {diff < 0 ? `Switching saves about ${gbp(-diff)} a year` : `Quote costs about ${gbp(diff)} a year more`}
          </p>
        )}
        <p className="text-xs text-stone-500">Based on unit rate × usage + standing charge × 365. Check exit fees before switching.</p>
      </div>
    </div>
  );
}
