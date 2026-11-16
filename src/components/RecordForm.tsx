"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { FORMS, type TableName } from "@/lib/fields";
import { saveRecord } from "@/lib/actions";

type Props = {
  table: TableName;
  record?: Record<string, unknown> | null;
  defaults?: Record<string, unknown>;
  hidden?: Record<string, string>;
  label?: string;
  title?: string;
  variant?: "primary" | "ghost" | "icon";
};

export default function RecordForm({ table, record, defaults, hidden, label, title, variant = "primary" }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveRecord, undefined);
  const fields = FORMS[table];
  const values = { ...(defaults ?? {}), ...(record ?? {}) };

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  const trigger =
    variant === "icon" ? (
      <button type="button" onClick={() => setOpen(true)} className="btn-icon" aria-label="Edit">
        <Pencil size={16} />
      </button>
    ) : (
      <button type="button" onClick={() => setOpen(true)} className={variant === "ghost" ? "btn-ghost" : "btn"}>
        {record ? <Pencil size={16} /> : <Plus size={16} />} {label ?? (record ? "Edit" : "Add")}
      </button>
    );

  return (
    <>
      {trigger}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={() => setOpen(false)}>
          <div className="bg-white w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
              <h2 className="font-semibold text-lg">{title ?? (record ? "Edit" : "Add")}</h2>
              <button type="button" onClick={() => setOpen(false)} className="btn-icon" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form action={action} className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input type="hidden" name="_table" value={table} />
              {record?.id ? <input type="hidden" name="_id" value={String(record.id)} /> : null}
              {Object.entries(hidden ?? {}).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              {fields.map((f) => {
                const v = values[f.name];
                const common = { name: f.name, id: `f-${f.name}`, required: f.required, placeholder: f.placeholder };
                return (
                  <div key={f.name} className={f.wide || f.type === "textarea" ? "sm:col-span-2" : ""}>
                    {f.type === "checkbox" ? (
                      <label className="flex items-center gap-2 text-sm mt-6">
                        <input type="checkbox" name={f.name} defaultChecked={v === undefined || v === null ? Boolean(f.checked) : Boolean(v)} className="h-4 w-4 accent-emerald-600" />
                        {f.label}
                      </label>
                    ) : (
                      <>
                        <label htmlFor={`f-${f.name}`} className="label">
                          {f.label}
                        </label>
                        {f.type === "select" ? (
                          <select {...common} defaultValue={(v as string) ?? f.options?.[0]?.value} className="input">
                            {f.options?.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : f.type === "textarea" ? (
                          <textarea {...common} defaultValue={(v as string) ?? ""} rows={3} className="input" />
                        ) : (
                          <input
                            {...common}
                            type={f.type === "money" || f.type === "number" ? "number" : f.type}
                            step={f.type === "money" ? "0.01" : f.type === "number" ? "any" : undefined}
                            inputMode={f.type === "money" || f.type === "number" ? "decimal" : undefined}
                            defaultValue={v === null || v === undefined ? "" : String(v)}
                            className="input"
                          />
                        )}
                        {f.help && <p className="text-xs text-stone-500 mt-1">{f.help}</p>}
                      </>
                    )}
                  </div>
                );
              })}
              {state?.error && <p className="sm:col-span-2 text-sm text-red-600">{state.error}</p>}
              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={pending} className="btn">
                  {pending ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
