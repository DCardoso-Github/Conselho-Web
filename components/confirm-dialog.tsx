"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: React.ReactNode;
    confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "Confirmar",
    onConfirm,
}: ConfirmDialogProps) {
    const [busy, setBusy] = React.useState(false);

    const handleConfirm = async () => {
        setBusy(true);
        try {
            await onConfirm();
            onOpenChange(false);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent hideClose className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && (
                        <DialogDescription>{description}</DialogDescription>
                    )}
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="ghost" disabled={busy}>
                            Cancelar
                        </Button>
                    </DialogClose>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={busy}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
