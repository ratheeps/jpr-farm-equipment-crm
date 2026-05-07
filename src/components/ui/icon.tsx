import * as React from "react";
import { cn } from "@/lib/utils";
import { resolveEntityIcon } from "@/lib/icon-map";

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeClass: Record<IconSize, string> = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
};

export interface IconProps extends React.SVGAttributes<SVGElement> {
  name: string;
  size?: IconSize;
  strokeWidth?: number;
}

export function Icon({
  name,
  size = "md",
  strokeWidth = 2,
  className,
  ...rest
}: IconProps) {
  const Resolved = resolveEntityIcon(name);
  return (
    <Resolved
      className={cn(sizeClass[size], className)}
      strokeWidth={strokeWidth}
      {...rest}
    />
  );
}
