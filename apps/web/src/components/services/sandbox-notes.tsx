import { FlaskConical } from "lucide-react";

export function SandboxNotes({ items }: { items: string[] }) {
  return (
    <details className="group rounded-2xl border border-line bg-white/70 px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-xs font-bold text-ink/65">
          <FlaskConical className="size-3.5 text-violet" aria-hidden />
          Sandbox test triggers
        </span>
        <span className="text-[0.6rem] font-semibold text-muted transition group-open:rotate-180">
          ▾
        </span>
      </summary>
      <ul className="mt-2.5 space-y-1.5 border-t border-line/70 pt-2.5 text-[0.65rem] leading-relaxed text-muted">
        {items.map((item) => (
          <li key={item} className="flex gap-1.5">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-violet/60" />
            {item}
          </li>
        ))}
      </ul>
    </details>
  );
}
