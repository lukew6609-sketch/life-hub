"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

const KEY = "lifehub.hideMoney";

/** Card whose contents can be blurred with an eye toggle. The choice is remembered on this device. */
export default function PrivateCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY) === "1");
    } catch {}
  }, []);

  const toggle = () => {
    setHidden((h) => {
      try {
        localStorage.setItem(KEY, h ? "0" : "1");
      } catch {}
      return !h;
    });
  };

  return (
    <section className="card">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button type="button" onClick={toggle} className="btn-icon" aria-pressed={hidden} aria-label={hidden ? "Show amounts" : "Hide amounts"} title={hidden ? "Show amounts" : "Hide amounts"}>
            {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {action}
      </div>
      <div className={`transition-[filter] duration-200 ${hidden ? "blur-md select-none pointer-events-none" : ""}`} aria-hidden={hidden}>
        {children}
      </div>
    </section>
  );
}
