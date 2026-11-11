"use client";

import { useEffect, useRef } from "react";
import { Megaphone, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type AdFormat = "leaderboard" | "rectangle" | "sidebar" | "inline";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

const ADSENSE_SLOTS: Record<AdFormat, string | undefined> = {
  leaderboard: process.env.NEXT_PUBLIC_ADSENSE_SLOT_LEADERBOARD,
  rectangle: process.env.NEXT_PUBLIC_ADSENSE_SLOT_RECTANGLE,
  sidebar: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR,
  inline: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INLINE,
};

const FORMAT_LABELS: Record<AdFormat, string> = {
  leaderboard: "Leaderboard · 970 × 90",
  rectangle: "Medium rectangle · 300 × 250",
  sidebar: "Half page · 300 × 600",
  inline: "In-feed · responsive",
};

const FORMAT_HEIGHTS: Record<AdFormat, string> = {
  leaderboard: "min-h-[90px]",
  rectangle: "min-h-[250px]",
  sidebar: "min-h-[280px] lg:min-h-[360px]",
  inline: "min-h-[120px]",
};

/**
 * Responsive AdSense surface. When `NEXT_PUBLIC_ADSENSE_CLIENT` and the matching
 * slot id are configured the real `<ins>` unit renders; otherwise a labelled
 * placeholder keeps the reserved space visible during development.
 */
export function AdSlot({
  format = "inline",
  slot,
  className,
  label = "Advertisement",
}: {
  format?: AdFormat;
  slot?: string;
  className?: string;
  label?: string;
}) {
  const pushed = useRef(false);
  const insRef = useRef<HTMLModElement | null>(null);
  const slotId = slot ?? ADSENSE_SLOTS[format];
  const live = Boolean(ADSENSE_CLIENT && slotId);

  useEffect(() => {
    if (!live || pushed.current || !insRef.current) return;
    try {
      const adsbygoogle = (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ?? [];
      adsbygoogle.push({});
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = adsbygoogle;
      pushed.current = true;
    } catch {
      // Ad blockers and offline previews should never break the page.
    }
  }, [live]);

  if (!live) {
    return (
      <aside
        aria-label={`${label} placeholder`}
        className={cn(
          "relative flex w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-ink/15 bg-[linear-gradient(110deg,#f3fbe0_0%,#eef7ff_45%,#f4efff_100%)] px-4 py-5",
          FORMAT_HEIGHTS[format],
          className,
        )}
      >
        <span className="bg-dots pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />
        <span className="relative flex flex-col items-center gap-2 text-center">
          <span className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ink/55 shadow-sm ring-1 ring-ink/5">
            <Sparkles className="size-3 text-violet" aria-hidden />
            {label}
          </span>
          <span className="flex items-center gap-2 text-sm font-semibold text-ink/70">
            <Megaphone className="size-4 text-coral" aria-hidden />
            Google AdSense
          </span>
          <span className="text-[0.68rem] font-medium text-muted">{FORMAT_LABELS[format]}</span>
        </span>
      </aside>
    );
  }

  return (
    <div className={cn("w-full overflow-hidden", className)} aria-label={label}>
      <span className="mb-1 block text-center text-[0.55rem] font-bold uppercase tracking-[0.22em] text-muted/70">
        {label}
      </span>
      <ins
        ref={insRef}
        className="adsbygoogle block w-full"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slotId}
        data-ad-format={format === "inline" ? "fluid" : "auto"}
        data-full-width-responsive="true"
      />
    </div>
  );
}
