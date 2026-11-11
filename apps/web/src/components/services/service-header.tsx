import type { ReactNode } from "react";
import { ServiceIcon } from "@/components/brand";

export function ServiceHeader({
  type,
  eyebrow,
  title,
  description,
  highlights,
}: {
  type: string;
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3.5">
        <ServiceIcon
          type={type}
          className="size-12 shrink-0 rounded-2xl shadow-sm"
          iconClassName="size-6"
        />
        <div>
          <span className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted">
            {eyebrow}
          </span>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-[1.8rem]">
            {title}
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink/55">{description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 sm:justify-end">
        {highlights.map((item) => (
          <span key={item} className="chip border-line bg-white text-[0.62rem] text-ink/55">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function FormSection({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-start gap-2.5">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[0.6rem] font-bold text-lime">
          {step}
        </span>
        <div>
          <h3 className="text-sm font-bold text-ink">{title}</h3>
          {description ? <p className="mt-0.5 text-[0.68rem] text-muted">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
