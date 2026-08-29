import * as React from "react";

import { cn } from "@/lib/utils";

function Skeleton({
  className,
  "aria-label": ariaLabel,
  role,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      data-motion="shimmer"
      role={role ?? (ariaLabel ? "status" : undefined)}
      aria-label={ariaLabel}
      aria-live={ariaLabel ? "polite" : undefined}
      className={cn("skeleton-shimmer rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
