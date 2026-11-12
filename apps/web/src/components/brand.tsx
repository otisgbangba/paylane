import { Fingerprint, Flame, Smartphone, Tv, Wifi, Zap, type LucideIcon } from "lucide-react";
import { NETWORKS, type NetworkId } from "@paylane/shared";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-[0.95rem] bg-lime text-ink shadow-[inset_0_-6px_14px_rgba(0,0,0,0.12)]",
        className,
      )}
      aria-hidden
    >
      <span className="absolute -right-2 -top-2 size-6 rounded-full bg-white/35" />
      <Zap className="relative size-5 fill-ink" strokeWidth={2.4} />
    </span>
  );
}

export function Brand({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark />
      {compact ? null : (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display text-[1.35rem] font-bold tracking-[-0.04em]",
              dark ? "text-white" : "text-ink",
            )}
          >
            Paylane
          </span>
          <span
            className={cn(
              "mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em]",
              dark ? "text-lime/70" : "text-muted",
            )}
          >
            Top-ups · Bills
          </span>
        </span>
      )}
    </span>
  );
}

export function NetworkBadge({ network }: { network: NetworkId }) {
  const item = NETWORKS.find((entry) => entry.id === network);
  if (!item) return null;
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-black/5 px-2.5 py-1 text-xs font-bold text-ink"
      style={{ backgroundColor: item.tint }}
    >
      <span
        className="grid size-5 place-items-center rounded-full text-[10px] font-black"
        style={{ backgroundColor: item.color, color: item.id === "MTN" || item.id === "GLO" ? "#0b1613" : "#fff" }}
      >
        {item.short}
      </span>
      {item.id === "ETISALAT" ? "9mobile" : item.id}
    </span>
  );
}

const serviceIcons: Record<string, { icon: LucideIcon; bg: string; text: string }> = {
  AIRTIME: { icon: Smartphone, bg: "bg-lime-soft", text: "text-[#4d6b00]" },
  DATA: { icon: Wifi, bg: "bg-sky-soft", text: "text-sky" },
  CABLE: { icon: Tv, bg: "bg-violet-soft", text: "text-violet" },
  ELECTRICITY: { icon: Zap, bg: "bg-amber-soft", text: "text-[#9a6200]" },
  VERIFICATION: { icon: Fingerprint, bg: "bg-success-soft", text: "text-success" },
  WALLET_FUNDING: { icon: Flame, bg: "bg-coral-soft", text: "text-coral" },
};

export function ServiceIcon({
  type,
  className,
  iconClassName,
}: {
  type: string;
  className?: string;
  iconClassName?: string;
}) {
  const config = serviceIcons[type] ?? serviceIcons.AIRTIME;
  const Icon = config?.icon ?? Smartphone;
  return (
    <span
      className={cn(
        "grid size-10 place-items-center rounded-xl",
        config?.bg,
        config?.text,
        className,
      )}
    >
      <Icon className={cn("size-5", iconClassName)} strokeWidth={2.1} />
    </span>
  );
}
