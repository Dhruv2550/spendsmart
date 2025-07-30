import * as React from "react"
import { cn } from "../../lib/utils"

interface TabsContextType {
  value?: string
  onValueChange?: (value: string) => void
}

const TabsContext = React.createContext<TabsContextType>({})

interface TabsProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  className?: string
  children?: React.ReactNode
}

export const Tabs = ({ className, value, defaultValue, onValueChange, children, ...props }: TabsProps) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  
  const currentValue = value !== undefined ? value : internalValue
  const handleValueChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
  }

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  className?: string
  children?: React.ReactNode
}

export const TabsList = ({ className, children, ...props }: TabsListProps) => (
  <div
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

interface TabsTriggerProps {
  value: string
  className?: string
  children?: React.ReactNode
}

export const TabsTrigger = ({ className, value, children, ...props }: TabsTriggerProps) => {
  const context = React.useContext(TabsContext)
  const isActive = context.value === value

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive && "bg-background text-foreground shadow-sm",
        className
      )}
      onClick={() => context.onValueChange?.(value)}
      {...props}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  className?: string
  children?: React.ReactNode
}

export const TabsContent = ({ className, value, children, ...props }: TabsContentProps) => {
  const context = React.useContext(TabsContext)
  
  if (context.value !== value) return null

  return (
    <div
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}