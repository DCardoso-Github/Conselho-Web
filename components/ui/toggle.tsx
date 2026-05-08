"use client";

import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const toggleVariants = cva(
    "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "bg-transparent hover:bg-secondary hover:text-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                outline:
                    "border border-border bg-transparent hover:bg-secondary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary",
                danger:
                    "border border-border bg-transparent hover:bg-secondary data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground data-[state=on]:border-destructive",
            },
            size: {
                default: "h-9 px-3",
                sm: "h-8 px-2.5 text-xs",
                lg: "h-10 px-4",
            },
        },
        defaultVariants: { variant: "default", size: "default" },
    }
);

const Toggle = React.forwardRef<
    React.ElementRef<typeof TogglePrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
    <TogglePrimitive.Root
        ref={ref}
        className={cn(toggleVariants({ variant, size, className }))}
        {...props}
    />
));
Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
