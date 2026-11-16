"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Bot, Send, Search, FileText } from "lucide-react";

const SUGGESTIONS = [
  "What's my pet insurance policy number?",
  "What renews in the next 2 months?",
  "Who's got my soldering iron?",
  "How much do I spend on insurance a year?",
  "What's my electricity unit rate and standing charge?",
  "When's my MOT due?",
];

export default function Chat({ initial }: { initial?: string }) {
  const { messages, sendMessage, status, error } = useChat({ transport: new DefaultChatTransport({ api: "/api/chat" }) });
  const [input, setInput] = useState("");
  const sent = useRef(false);
  const end = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (initial && !sent.current) {
      sent.current = true;
      sendMessage({ text: initial });
    }
  }, [initial, sendMessage]);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const ask = (t: string) => {
    if (!t.trim() || busy) return;
    sendMessage({ text: t });
    setInput("");
  };

  return (
    <div className="card flex flex-col h-[calc(100vh-12rem)] min-h-[420px] p-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="mx-auto text-emerald-700" />
            <p className="text-sm text-stone-600 mt-2 mb-4">I&apos;ve read everything you&apos;ve uploaded. Try:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} className="btn-ghost text-xs">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === "user" ? "bg-emerald-700 text-white" : "bg-stone-100"}`}>
              {m.parts.map((p, i) => {
                if (p.type === "text") return <div key={i} className="whitespace-pre-wrap">{p.text}</div>;
                if (p.type === "tool-search_documents") return <div key={i} className="text-xs text-stone-500 flex items-center gap-1 my-1"><Search size={12} /> Searching documents…</div>;
                if (p.type === "tool-read_document") return <div key={i} className="text-xs text-stone-500 flex items-center gap-1 my-1"><FileText size={12} /> Reading a document…</div>;
                return null;
              })}
            </div>
          </div>
        ))}
        {status === "submitted" && <div className="text-xs text-stone-500">Thinking…</div>}
        {error && <div className="text-sm text-red-600">Something went wrong: {error.message}</div>}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="border-t p-3 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} className="input" placeholder="Ask about your stuff…" />
        <button className="btn" disabled={busy} aria-label="Send"><Send size={16} /></button>
      </form>
    </div>
  );
}
