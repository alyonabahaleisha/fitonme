import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-brand text-white hover:bg-brand-600 shadow-md hover:shadow-lg font-semibold transition-all",
        hero: "!bg-[#2d4a3e] text-white hover:!bg-[#243d33] active:!bg-[#243d33] font-semibold rounded-xl border-none outline-none ring-0 ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-none shadow-none appearance-none [-webkit-appearance:none]",
        secondary: "bg-white text-foreground hover:bg-white/90 border border-border/60 shadow-sm backdrop-blur-sm",
        outline: "border-2 border-brand/40 bg-transparent hover:bg-brand/10 text-brand font-medium",
        ghost: "hover:bg-secondary/50 hover:text-foreground",
        link: "text-brand underline-offset-4 hover:underline",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-11 px-6 py-2.5 text-base rounded-xl",
        sm: "h-9 rounded-lg px-4 text-sm",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
