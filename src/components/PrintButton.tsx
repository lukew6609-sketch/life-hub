"use client";
import { Printer } from "lucide-react";

export default function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-ghost print:hidden">
      <Printer size={16} /> {label}
    </button>
  );
}
