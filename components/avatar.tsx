"use client";

import { useEffect, useState } from "react";
import { blobToObjectURL } from "@/lib/photos";
import { cn } from "@/lib/utils";

const PALETTE = [
    "#1976D2", "#D81B60", "#43A047", "#FB8C00",
    "#5E35B1", "#00897B", "#3949AB", "#C0392B",
];

function hashCode(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (h << 5) - h + str.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface AvatarProps {
    name: string;
    photo?: Blob | null;
    size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
    className?: string;
    rounded?: "full" | "lg";
}

const SIZE_MAP: Record<NonNullable<AvatarProps["size"]>, { box: string; text: string }> = {
    xs: { box: "w-8 h-8", text: "text-xs" },
    sm: { box: "w-12 h-12", text: "text-sm" },
    md: { box: "w-20 h-20", text: "text-lg" },
    lg: { box: "w-32 h-32", text: "text-2xl" },
    xl: { box: "w-48 h-48", text: "text-4xl" },
    "2xl": { box: "w-64 h-64", text: "text-5xl" },
};

export function Avatar({
    name,
    photo,
    size = "md",
    className,
    rounded = "full",
}: AvatarProps) {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        const u = blobToObjectURL(photo ?? undefined);
        setUrl(u);
        return () => {
            if (u) URL.revokeObjectURL(u);
        };
    }, [photo]);

    const sz = SIZE_MAP[size];
    const radius = rounded === "full" ? "rounded-full" : "rounded-2xl";

    if (url) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={url}
                alt={name}
                className={cn(sz.box, radius, "object-cover bg-[var(--surface-2)]", className)}
            />
        );
    }

    const color = PALETTE[hashCode(name) % PALETTE.length];
    return (
        <div
            className={cn(
                sz.box,
                radius,
                sz.text,
                "flex items-center justify-center font-bold text-white select-none",
                className,
            )}
            style={{ background: color }}
            aria-label={name}
        >
            {initials(name)}
        </div>
    );
}
