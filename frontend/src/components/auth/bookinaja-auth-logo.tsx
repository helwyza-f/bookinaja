"use client";

import Image from "next/image";
import { BOOKINAJA_LOGO_NORMAL_SRC } from "@/lib/brand";

type BookinajaAuthLogoProps = {
  priority?: boolean;
  className?: string;
  imageClassName?: string;
};

export function BookinajaAuthLogo({
  priority = false,
  className = "",
  imageClassName = "h-10 w-auto object-contain",
}: BookinajaAuthLogoProps) {
  return (
    <div
      className={`inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm ${className}`.trim()}
    >
      <Image
        src={BOOKINAJA_LOGO_NORMAL_SRC}
        alt="Bookinaja"
        width={164}
        height={48}
        priority={priority}
        className={imageClassName}
      />
    </div>
  );
}
