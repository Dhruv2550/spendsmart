import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [open, onOpenChange])

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={() => onOpenChange(false)}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <div 
        className="absolute inset-0 flex items-center justify-center p-4"
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '1rem'
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

interface DialogContentProps {
  className?: string
  children?: React.ReactNode
}

export const DialogContent = ({ className, children, ...props }: DialogContentProps & React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "relative z-10 grid w-full gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg max-h-[85vh] overflow-y-auto",
      className
    )}
    style={{
      position: 'relative',
      zIndex: 10,
      maxHeight: '85vh',
      overflowY: 'auto',
      backgroundColor: 'white',
      borderRadius: '0.5rem',
      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
    }}
    {...props}
  >
    {children}
  </div>
)

export const DialogHeader = ({ className, children, ...props }: DialogContentProps & React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props}
  >
    {children}
  </div>
)

export const DialogTitle = ({ className, children, ...props }: DialogContentProps & React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  >
    {children}
  </h3>
)