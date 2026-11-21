import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

// Owned shadcn/ui-style primitive, following the Radix + CVA composition pattern.
const buttonVariants = cva('button', { variants: {
  variant: { default: 'button-primary', outline: 'button-outline', ghost: 'button-ghost', destructive: 'button-danger' },
  size: { default: '', sm: 'button-sm', icon: 'button-icon' },
}, defaultVariants: { variant: 'default', size: 'default' } })
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant, size, asChild, ...props }, ref) {
  const Component = asChild ? Slot : 'button'
  return <Component ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
})
