"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CodeBlock({
  code,
  label,
  className,
}: {
  code: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access is blocked in some previews; the code stays selectable.
    }
  }

  return (
    <div className={cn("overflow-hidden rounded-2xl bg-forest text-white/85", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2">
        <span className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
          {label ?? "Response"}
        </span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[0.62rem] font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="size-3.5 text-lime" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 text-[0.7rem] leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}
