"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileArchive, Folder, ImageUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { FileDrop } from "@/components/file-drop";
import {
    importPhotosFromFiles,
    importPhotosFromZip,
    type PhotoImportResult,
} from "@/lib/photos";

interface Props {
    classId: string;
    open: boolean;
    onOpenChange: (v: boolean) => void;
}

export function PhotoImporter({ classId, open, onOpenChange }: Props) {
    const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);
    const [unmatched, setUnmatched] = React.useState<string[]>([]);
    const [busy, setBusy] = React.useState(false);
    const [doneCount, setDoneCount] = React.useState<number | null>(null);

    const finish = (r: PhotoImportResult) => {
        setProgress(null);
        setBusy(false);
        setUnmatched(r.unmatched);
        if (r.matched > 0) {
            setDoneCount(r.matched);
            setTimeout(() => setDoneCount(null), 1500);
            toast.success(`${r.matched} foto(s) associadas`, {
                description:
                    r.unmatched.length > 0
                        ? `${r.unmatched.length} sem correspondência.`
                        : "Todas as imagens foram associadas.",
            });
        } else {
            toast.error("Nenhuma foto associada", {
                description: `${r.unmatched.length} arquivo(s) sem correspondência.`,
            });
        }
    };

    const handleFiles = async (files: File[]) => {
        if (files.length === 0 || busy) return;
        setBusy(true);
        setProgress({ done: 0, total: files.length });
        setUnmatched([]);
        try {
            const r = await importPhotosFromFiles(classId, files, (done, total) =>
                setProgress({ done, total })
            );
            finish(r);
        } catch (e) {
            setBusy(false);
            setProgress(null);
            toast.error(e instanceof Error ? e.message : "Falha ao importar");
        }
    };

    const handleZip = async (files: File[]) => {
        if (files.length === 0 || busy) return;
        const zip = files[0];
        setBusy(true);
        setProgress({ done: 0, total: 1 });
        setUnmatched([]);
        try {
            const r = await importPhotosFromZip(classId, zip, (done, total) =>
                setProgress({ done, total })
            );
            finish(r);
        } catch (e) {
            setBusy(false);
            setProgress(null);
            toast.error(e instanceof Error ? e.message : "Falha ao processar ZIP");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 space-y-1">
                    <DialogTitle>Importar fotos · {classId}</DialogTitle>
                    <DialogDescription>
                        Os arquivos são associados pelo nome (ex.:{" "}
                        <code className="font-mono text-xs px-1 py-0.5 rounded bg-muted">
                            JOAO DA SILVA.jpg
                        </code>
                        ). Detecção automática de rosto · recorte 600×600.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 pb-6 space-y-3 max-h-[70vh] overflow-y-auto">
                    <FileDrop
                        accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
                        onFiles={handleFiles}
                        label="Imagens"
                        hint="Arraste ou clique para selecionar imagens individuais"
                        icon={<ImageUp className="size-6" />}
                        disabled={busy}
                    />
                    <FileDrop
                        onFiles={handleFiles}
                        label="Pasta inteira"
                        hint="Importa todas as imagens dentro da pasta"
                        icon={<Folder className="size-6" />}
                        webkitdirectory
                        disabled={busy}
                    />
                    <FileDrop
                        accept={{ "application/zip": [".zip"] }}
                        onFiles={handleZip}
                        label="Arquivo ZIP"
                        hint="Extrai e importa todas as imagens contidas"
                        icon={<FileArchive className="size-6" />}
                        multiple={false}
                        disabled={busy}
                    />

                    {doneCount !== null && (
                        <div className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-success" role="status" aria-live="polite">
                            <CheckCircle2 className="size-4" />
                            {doneCount} foto{doneCount !== 1 ? "s" : ""} importada{doneCount !== 1 ? "s" : ""}
                        </div>
                    )}

                    {progress && (
                        <div className="space-y-1.5 pt-2">
                            <Progress
                                value={(progress.done / Math.max(1, progress.total)) * 100}
                            />
                            <p className="text-xs text-muted-foreground text-center tabular-nums">
                                {progress.done} / {progress.total}
                            </p>
                        </div>
                    )}

                    {unmatched.length > 0 && (
                        <div className="rounded-xl border border-warning/40 bg-warning/5 p-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-warning mb-2">
                                <AlertTriangle className="size-4" />
                                Sem correspondência ({unmatched.length})
                            </div>
                            <ul className="text-xs text-muted-foreground max-h-40 overflow-auto space-y-0.5 font-mono">
                                {unmatched.map((n) => (
                                    <li key={n}>• {n}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
