"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { UploadCloud } from "lucide-react";

type AcceptMap = Record<string, string[]>;

export interface FileDropProps {
    onFiles: (files: File[]) => void;
    accept?: AcceptMap;
    multiple?: boolean;
    webkitdirectory?: boolean;
    label?: React.ReactNode;
    hint?: React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
    disabled?: boolean;
}

function buildAccept(accept?: AcceptMap): string | undefined {
    if (!accept) return undefined;
    const parts: string[] = [];
    for (const [mime, exts] of Object.entries(accept)) {
        if (mime) parts.push(mime);
        for (const e of exts) parts.push(e);
    }
    return parts.join(",");
}

export function FileDrop({
    onFiles,
    accept,
    multiple = true,
    webkitdirectory,
    label = "Clique ou arraste arquivos",
    hint,
    icon,
    className,
    disabled,
}: FileDropProps) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [over, setOver] = React.useState(false);

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setOver(false);
        if (disabled) return;
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onFiles(files);
    };

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => !disabled && inputRef.current?.click()}
            onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !disabled) { e.preventDefault(); inputRef.current?.click(); }
            }}
            onDragEnter={(e) => {
                e.preventDefault();
                setOver(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
            className={cn(
                "group relative flex min-h-64 flex-col items-center justify-center gap-6 rounded-3xl border-2 border-dashed border-border bg-card px-6 py-10 text-center transition-all cursor-pointer",
                "hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                over && "border-primary bg-primary/10 scale-[1.01]",
                disabled && "opacity-60 cursor-not-allowed",
                className
            )}
        >
            <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                {icon ?? <UploadCloud className="size-6" />}
            </div>
            <div>
                <p className="text-2xl font-semibold text-foreground">{label}</p>
                {hint && <p className="text-lg text-muted-foreground mt-2">{hint}</p>}
            </div>
            <input
                ref={inputRef}
                type="file"
                hidden
                multiple={multiple}
                accept={buildAccept(accept)}
                // @ts-expect-error vendor attribute
                webkitdirectory={webkitdirectory ? "" : undefined}
                directory={webkitdirectory ? "" : undefined}
                onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length) onFiles(files);
                    e.target.value = "";
                }}
            />
        </div>
    );
}
