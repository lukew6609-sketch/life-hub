"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteRecord } from "@/lib/actions";

export default function DeleteButton({ table, id, what = "this", after }: { table: string; id: string; what?: string; after?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-icon text-stone-400 hover:text-red-600"
      aria-label="Delete"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete ${what}? This can't be undone.`)) return;
        start(async () => {
          await deleteRecord(table, id);
          if (after) window.location.href = after;
        });
      }}
    >
      <Trash2 size={16} />
    </button>
  );
}
