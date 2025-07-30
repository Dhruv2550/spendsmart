import { cn } from "../../lib/utils"

interface CardProps {
  className?: string
  children?: React.ReactNode
}

export const Card = ({ className, children, ...props }: CardProps & React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

export const CardHeader = ({ className, children, ...props }: CardProps & React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn("flex flex-col space-y-1.5 p-6", className)} 
    {...props}
  >
    {children}
  </div>
)

export const CardTitle = ({ className, children, ...props }: CardProps & React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  >
    {children}
  </h3>
)

export const CardContent = ({ className, children, ...props }: CardProps & React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn("p-6 pt-0", className)} 
    {...props}
  >
    {children}
  </div>
)