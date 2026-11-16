"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const res =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    setBusy(false);
    if (res.error) {
      setMsg(res.error.message.includes("Database error") ? "Sign-ups are closed for this app." : res.error.message);
      return;
    }
    if (mode === "up" && !res.data.session) {
      setMsg("Check your email to confirm your account, then sign in.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-emerald-700 text-white grid place-items-center font-bold">L</div>
          <div>
            <h1 className="font-semibold text-lg leading-tight">Life Hub</h1>
            <p className="text-xs text-stone-500">{mode === "in" ? "Sign in" : "Create your account"}</p>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pw">Password</label>
          <input id="pw" type="password" required minLength={8} autoComplete={mode === "in" ? "current-password" : "new-password"} className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {msg && <p className="text-sm text-stone-700 bg-stone-100 rounded-lg p-2">{msg}</p>}
        <button className="btn w-full justify-center" disabled={busy}>{busy ? "…" : mode === "in" ? "Sign in" : "Create account"}</button>
        <button type="button" className="text-xs text-stone-500 w-full" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "First time? Create the owner account" : "Already set up? Sign in"}
        </button>
      </form>
    </main>
  );
}
