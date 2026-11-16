"use client";

import { useTransition, type ReactNode } from "react";

/** Small button that runs a server action. */
export default function ActionButton({ action, children, className = "btn-ghost" }: { action: () => Promise<void>; children: ReactNode; className?: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} className={className} onClick={() => start(() => action())}>
      {pending ? "…" : children}
    </button>
  );
}
