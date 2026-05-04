import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-card px-2.5 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] transition-[color,background-color,border-color,box-shadow] outline-none placeholder:text-muted-foreground/90 focus-visible:border-ring focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-white/[0.06] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:focus-visible:bg-white/[0.08] dark:disabled:bg-white/[0.04] dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
