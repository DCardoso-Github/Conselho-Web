import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
    "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors [&>svg]:size-3 whitespace-nowrap",
    {
        variants: {
            variant: {
                default: "bg-primary/10 text-primary border-primary/20",
                secondary: "bg-secondary text-secondary-foreground border-transparent",
                destructive: "bg-destructive/10 text-destructive border-destructive/30",
                success: "bg-success/10 text-success border-success/30",
                warning: "bg-warning/10 text-warning-foreground border-warning/30 dark:text-warning",
                outline: "text-foreground",
                soft: "bg-low-bg text-low-fg border-transparent",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

function Badge({
    className,
    variant,
    ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
    return (
        <div
            className={cn(
                badgeVariants({ variant }),
                // map low-bg / low-fg via inline style fallback
                className
            )}
            style={
                variant === "soft"
                    ? { background: "var(--low-bg)", color: "var(--low-fg)" }
                    : undefined
            }
            {...props}
        />
    );
}

export { Badge, badgeVariants };
