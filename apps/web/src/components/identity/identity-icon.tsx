import {
  Baby,
  Building2,
  CalendarDays,
  CreditCard,
  FileCheck2,
  FileText,
  Fingerprint,
  MapPin,
  PencilLine,
  Phone,
  ShieldCheck,
  Unlink,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { IdentityServiceId } from "@paylane/shared";
import { cn } from "@/lib/utils";

const ICONS: Record<IdentityServiceId, { icon: LucideIcon; tint: string }> = {
  NIN_VERIFICATION: { icon: Fingerprint, tint: "bg-lime-soft text-[#4d6b00]" },
  BVN_VERIFICATION: { icon: CreditCard, tint: "bg-sky-soft text-sky" },
  NIN_SLIP: { icon: FileText, tint: "bg-violet-soft text-violet" },
  IPE_CLEARANCE: { icon: ShieldCheck, tint: "bg-amber-soft text-[#9a6200]" },
  NIN_PERSONALIZATION: { icon: FileCheck2, tint: "bg-coral-soft text-coral" },
  NIN_DELINKING: { icon: Unlink, tint: "bg-success-soft text-success" },
  NIN_NAME_CHANGE: { icon: PencilLine, tint: "bg-sky-soft text-sky" },
  NIN_PHONE_CHANGE: { icon: Phone, tint: "bg-lime-soft text-[#4d6b00]" },
  NIN_DOB_CHANGE: { icon: CalendarDays, tint: "bg-violet-soft text-violet" },
  NIN_ADDRESS_CHANGE: { icon: MapPin, tint: "bg-amber-soft text-[#9a6200]" },
  NIN_CHILD_ENROLMENT: { icon: Baby, tint: "bg-coral-soft text-coral" },
  NIN_ADULT_ENROLMENT: { icon: UserPlus, tint: "bg-success-soft text-success" },
};

export function IdentityIcon({
  service,
  className,
  iconClassName,
}: {
  service: IdentityServiceId;
  className?: string;
  iconClassName?: string;
}) {
  const config = ICONS[service] ?? { icon: Users, tint: "bg-cream text-ink/60" };
  const Icon = config.icon;
  return (
    <span className={cn("grid size-10 place-items-center rounded-xl", config.tint, className)}>
      <Icon className={cn("size-5", iconClassName)} strokeWidth={2.1} aria-hidden />
    </span>
  );
}

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  LOOKUP: Fingerprint,
  SLIP: FileText,
  RECORD: PencilLine,
  ENROLMENT: Building2,
};
