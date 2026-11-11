import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "accent" | "outline" | "ghost";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "btn-primary",
  accent: "btn-accent",
  outline: "btn-outline",
  ghost: "btn-ghost",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  children,
  disabled,
  ...props
}: ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}) {
  return (
    <button
      className={cn("btn", variants[variant], size === "sm" && "btn-sm", className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <Link
      className={cn("btn", variants[variant], size === "sm" && "btn-sm", className)}
      {...props}
    >
      {children}
    </Link>
  );
}

export function FieldLabel({
  children,
  hint,
  htmlFor,
}: {
  children: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <label className="label mb-0" htmlFor={htmlFor}>
        {children}
      </label>
      {hint ? <span className="text-xs font-medium text-muted">{hint}</span> : null}
    </div>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-2 text-xs font-medium text-danger">{children}</p>;
}
