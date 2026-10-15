import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                ref={ref}
                className={cn(
                    "flex min-h-12 w-full rounded-xl border border-input bg-transparent px-4 py-2 text-lg shadow-xs transition-colors",
                    "placeholder:text-muted-foreground",
                    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
                    className
                )}
                {...props}
            />
        );
    }
);
Input.displayName = "Input";

export { Input };
