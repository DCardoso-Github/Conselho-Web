"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { MotionConfig } from "motion/react";

// Suppress the React 19 warning for next-themes script tag
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    const orig = console.error;
    console.error = (...args: unknown[]) => {
        if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) {
            return;
        }
        orig.apply(console, args);
    };
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
            storageKey="conselho-theme"
        >
            <MotionConfig reducedMotion="user" transition={{ duration: 0.18 }}>
            <TooltipProvider delayDuration={150}>
                {children}
                <Toaster />
            </TooltipProvider>
            </MotionConfig>
        </ThemeProvider>
    );
}
