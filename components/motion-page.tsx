"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

export function MotionPage({
    children,
    className,
    ...props
}: HTMLMotionProps<"div">) {
    const reduced = useReducedMotion();
    return (
        <motion.div
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
            className={cn(className)}
            {...props}
        >
            {children}
        </motion.div>
    );
}
