"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="conselho-theme"
        >
            <TooltipProvider delayDuration={150}>
                {children}
                <Toaster />
            </TooltipProvider>
        </ThemeProvider>
    );
}
