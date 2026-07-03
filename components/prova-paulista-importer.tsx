"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { FileDrop } from "@/components/file-drop";
import { importProvaPaulista, type ProvaPaulistaImportResult } from "@/lib/actions";

interface Props {
    classId: string;
    open: boolean;
    onOpenChange: (v: boolean) => void;
}

export function ProvaPaulistaImporter({ classId, open, onOpenChange }: Props) {
    const [unmatched, setUnmatched] = React.useState<string[]>([]);
    const [busy, setBusy] = React.useState(false);
    const [doneCount, setDoneCount] = React.useState<number | null>(null);

    const finish = (r: ProvaPaulistaImportResult) => {
        setBusy(false);
        setUnmatched(r.unmatched);
        if (r.matched > 0) {
            setDoneCount(r.matched);
            setTimeout(() => setDoneCount(null), 2500);
            toast.success(`${r.matched} notas da Prova Paulista associadas`, {
                description:
                    r.unmatched.length > 0
                        ? `${r.unmatched.length} aluno(s) na planilha não foram encontrados nesta turma.`
                        : "Todos os dados foram associados com sucesso.",
            });
        } else {
            toast.error("Nenhum aluno associado", {
                description: "Verifique se os nomes dos alunos coincidem com os cadastrados na turma.",
            });
        }
    };

    const handleFiles = async (files: File[]) => {
        if (files.length === 0 || busy) return;
        const file = files[0];
        setBusy(true);
        setUnmatched([]);
        setDoneCount(null);
        try {
            const r = await importProvaPaulista(classId, file);
            finish(r);
        } catch (e) {
            setBusy(false);
            toast.error(e instanceof Error ? e.message : "Falha ao importar");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 space-y-1">
                    <DialogTitle>Importar Resultados da Prova Paulista · {classId}</DialogTitle>
                    <DialogDescription>
                        Carregue uma planilha <code className="font-mono text-xs px-1 py-0.5 rounded bg-muted">.xlsx</code> com os resultados da Prova Paulista. O sistema associará os dados pelo nome dos alunos.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 pb-6 space-y-3 max-h-[70vh] overflow-y-auto">
                    <FileDrop
                        accept={{
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                                [".xlsx"],
                        }}
                        onFiles={handleFiles}
                        label="Planilha de Resultados"
                        hint="Arraste ou clique para selecionar o arquivo da Prova Paulista (.xlsx)"
                        icon={busy ? <Loader2 className="size-6 animate-spin text-primary" /> : <FileSpreadsheet className="size-6 text-primary" />}
                        disabled={busy}
                        multiple={false}
                    />

                    {doneCount !== null && (
                        <div className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-success animate-fade-in" role="status" aria-live="polite">
                            <CheckCircle2 className="size-4" />
                            {doneCount} aluno{doneCount !== 1 ? "s" : ""} atualizado{doneCount !== 1 ? "s" : ""} com resultados da Prova Paulista
                        </div>
                    )}

                    {unmatched.length > 0 && (
                        <div className="rounded-xl border border-warning/40 bg-warning/5 p-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-warning mb-2">
                                <AlertTriangle className="size-4" />
                                Alunos na planilha não correspondidos na turma ({unmatched.length})
                            </div>
                            <p className="text-[11px] text-muted-foreground mb-2">
                                Esses alunos estavam na planilha importada, mas não foram encontrados cadastrados nesta turma ({classId}).
                            </p>
                            <ul className="text-xs text-muted-foreground max-h-40 overflow-auto space-y-0.5 font-mono">
                                {unmatched.map((n, idx) => (
                                    <li key={`${n}-${idx}`}>• {n}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
