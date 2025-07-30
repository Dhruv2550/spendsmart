import { cn } from "../../lib/utils"

interface SeparatorProps {
  orientation?: "horizontal" | "vertical"
  decorative?: boolean
  className?: string
}

export const Separator = ({ 
  className, 
  orientation = "horizontal", 
  decorative = true, 
  ...props 
}: SeparatorProps) => (
  <div
    role={decorative ? "none" : "separator"}
    aria-orientation={orientation === "vertical" ? "vertical" : undefined}
    className={cn(
      "shrink-0 bg-border",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className
    )}
    {...props}
  />
)