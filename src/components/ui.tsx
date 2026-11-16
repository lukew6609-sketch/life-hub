import Link from "next/link";
import type { ReactNode } from "react";
import { fmtDate, relDays } from "@/lib/money";
import { urgency } from "@/lib/urgency";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && <p className="text-stone-500 text-sm mt-1">{subtitle}</p>}
      </div>
      <div className="flex gap-2 flex-wrap">{children}</div>
    </div>
  );
}

export function Card({ children, className = "", title, action }: { children: ReactNode; className?: string; title?: string; action?: ReactNode }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h2 className="font-semibold text-lg">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, href }: { label: string; value: string; sub?: string; href?: string }) {
  const inner = (
    <div className="card h-full">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="num text-2xl mt-1">{value}</p>
      {sub && <p className="text-xs text-stone-500 mt-1">{sub}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:-translate-y-0.5 transition">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function DueBadge({ date }: { date?: string | null }) {
  if (!date) return <span className="text-stone-400">—</span>;
  const n = Math.round((new Date(date + "T00:00:00").getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
  const tone = urgency(n).chip;
  return (
    <span className="inline-flex flex-col">
      <span>{fmtDate(date)}</span>
      <span className={`text-[11px] px-1.5 py-0.5 rounded w-fit mt-0.5 ${tone}`}>{relDays(n)}</span>
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="text-sm text-stone-500 border border-dashed border-stone-300 rounded-2xl p-8 text-center">{children}</div>;
}
