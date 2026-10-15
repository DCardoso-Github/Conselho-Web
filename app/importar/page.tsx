"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
    CheckCircle2,
    XCircle,
    Loader2,
    ArrowRight,
    ArrowLeft,
    FileSpreadsheet,
    Sparkles,
    Trash2,
    ShieldCheck,
} from "lucide-react";
import type { SchoolPeriod } from "@/lib/db";
import { PeriodFields } from "@/components/period-fields";
import { periodLabel } from "@/lib/evolution";
import { importMapaoFile } from "@/lib/actions";
import { FileDrop } from "@/components/file-drop";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Step = "select" | "review" | "done";

interface FileResult {
    name: string;
    ok: boolean;
    msg: string;
    classId?: string;
    studentCount?: number;
    overwritten?: boolean;
}

export default function ImportarPage() {
    const [step, setStep] = React.useState<Step>("select");
    const [files, setFiles] = React.useState<File[]>([]);
    const [busy, setBusy] = React.useState(false);
    const [results, setResults] = React.useState<FileResult[]>([]);
    const [period, setPeriod] = React.useState<SchoolPeriod>({ year: new Date().getFullYear(), term: 1 });
    const [replace, setReplace] = React.useState(false);
    const [progress, setProgress] = React.useState(0);

    const onPicked = (picked: File[]) => {
        setFiles(picked);
        setStep("review");
    };

    const removeFile = (name: string) => {
        setFiles((f) => f.filter((x) => x.name !== name));
    };

    const startImport = async () => {
        setBusy(true);
        setProgress(0);
        const out: FileResult[] = [];
        let i = 0;
        for (const f of files) {
            try {
                const r = await importMapaoFile(f, { period, replace });
                out.push({
                    name: f.name,
                    ok: true,
                    msg: `${r.classId} · ${periodLabel(period)} · ${r.studentCount} alunos · ${r.historical ? "histórico salvo" : "mapão atual"}${r.overwritten ? " (bimestre atualizado)" : ""}`,
                    classId: r.classId,
                    studentCount: r.studentCount,
                    overwritten: r.overwritten,
                });
            } catch (e) {
                out.push({ name: f.name, ok: false, msg: (e as Error).message });
            }
            i++;
            setProgress(Math.round((i / files.length) * 100));
        }
        setResults(out);
        setBusy(false);
        setStep("done");
        const ok = out.filter((r) => r.ok).length;
        const overwrote = out.filter((r) => r.overwritten).length;
        if (ok > 0) {
            toast.success(
                overwrote > 0
                    ? `${ok} planilha(s) importada(s) · ${overwrote} sobrescrita(s).`
                    : `${ok} planilha(s) importada(s).`,
            );
        }
        if (out.length - ok > 0) toast.error(`${out.length - ok} falharam.`);
    };

    const reset = () => {
        setFiles([]);
        setResults([]);
        setProgress(0);
        setStep("select");
    };

    return (
        <div className="console-container import-screen max-w-5xl">
            <div className="import-heading mb-8">
                <Badge variant="soft" className="mb-2">
                    <Sparkles className="size-3" /> Importar
                </Badge>
                <h1 className="h-hero text-3xl sm:text-4xl mb-2">
                    Carregar mapão
                </h1>
                <p className="text-muted-foreground">
                    Selecione um ou mais arquivos <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted">.xlsx</code>.
                    O sistema detecta o cabeçalho automaticamente e mantém apenas alunos{" "}
                    <strong>ATIVOS</strong>.
                </p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                    <ShieldCheck className="size-3.5 shrink-0" />
                    Dados armazenados apenas neste dispositivo · nunca enviados a servidores
                </p>
            </div>

            <Stepper step={step} />

            <div className="mt-6 min-h-[280px]">
                <AnimatePresence mode="wait">
                    {step === "select" && (
                        <motion.div
                            key="select"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            transition={{ duration: 0.25 }}
                        >
                            <FileDrop
                                accept={{
                                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                                        [".xlsx"],
                                }}
                                onFiles={onPicked}
                                label="Clique ou arraste arquivos .xlsx"
                                hint="O nome da turma é extraído do nome do arquivo (ex.: 9º_ANO_A → 9A)"
                                icon={<FileSpreadsheet className="size-6" />}
                            />
                        </motion.div>
                    )}

                    {step === "review" && (
                        <motion.div
                            key="review"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-4"
                        >
                            <PeriodFields value={period} onChange={(value) => { setPeriod(value); setReplace(false); }} disabled={busy} label="Período dos arquivos selecionados" />
                            <p className="supporting-text">Importe arquivos do mesmo ano e bimestre por vez. Bimestres anteriores ficam no histórico; o mais recente aparece na turma. Para turmas já cadastradas sem período, identifique primeiro o mapão atual em Gerenciar turma → Mapões e bimestres.</p>
                            <label className="check-row"><input type="checkbox" checked={replace} disabled={busy} onChange={(event) => setReplace(event.target.checked)} />Atualizar este bimestre se ele já estiver salvo. Os outros bimestres serão mantidos.</label>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
                                        {files.length} arquivo(s) selecionado(s)
                                    </div>
                                    <ul className="divide-y divide-border">
                                        {files.map((f) => (
                                            <li
                                                key={f.name}
                                                className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
                                            >
                                                <FileSpreadsheet className="size-4 text-primary shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-medium truncate">
                                                        {f.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {(f.size / 1024).toFixed(1)} KB
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => removeFile(f.name)}
                                                    aria-label="Remover"
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>

                            {busy && (
                                <div className="space-y-1.5">
                                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                        <motion.div
                                            className="h-full bg-primary"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center">
                                        Importando… {progress}%
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-between gap-2">
                                <Button variant="ghost" onClick={reset} disabled={busy}>
                                    <ArrowLeft /> Voltar
                                </Button>
                                <Button
                                    onClick={startImport}
                                    disabled={busy || files.length === 0 || period.year < 2000 || period.year > 2100 || !Number.isInteger(period.year)}
                                    size="lg"
                                >
                                    {busy ? (
                                        <>
                                            <Loader2 className="animate-spin" /> Importando…
                                        </>
                                    ) : (
                                        <>
                                            Confirmar importação <ArrowRight />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === "done" && (
                        <motion.div
                            key="done"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-3"
                        >
                            {results.map((r) => (
                                <Card
                                    key={r.name}
                                    className={cn(
                                        "border-l-4",
                                        r.ok ? "border-l-success" : "border-l-destructive"
                                    )}
                                >
                                    <CardContent className="p-3 flex items-center gap-3">
                                        {r.ok ? (
                                            <CheckCircle2 className="size-5 text-success shrink-0" />
                                        ) : (
                                            <XCircle className="size-5 text-destructive shrink-0" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium truncate">{r.name}</div>
                                            <div className="text-xs text-muted-foreground">{r.msg}</div>
                                        </div>
                                        {r.ok && r.classId && (
                                            <Button asChild size="sm" variant="outline">
                                                <Link href={`/turmas/${encodeURIComponent(r.classId)}`}>
                                                    Abrir <ArrowRight />
                                                </Link>
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}

                            <div className="flex justify-between gap-2 pt-2">
                                <Button variant="ghost" onClick={reset}>
                                    Importar outros
                                </Button>
                                <Button asChild>
                                    <Link href="/">Voltar ao início</Link>
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function Stepper({ step }: { step: Step }) {
    const steps: { id: Step; label: string }[] = [
        { id: "select", label: "Selecionar" },
        { id: "review", label: "Revisar" },
        { id: "done", label: "Concluído" },
    ];
    const idx = steps.findIndex((s) => s.id === step);
    return (
        <ol className="flex items-center gap-2">
            {steps.map((s, i) => {
                const active = i === idx;
                const done = i < idx;
                return (
                    <React.Fragment key={s.id}>
                        <li
                            className={cn(
                                "flex items-center gap-2 text-sm font-medium transition-colors",
                                active
                                    ? "text-foreground"
                                    : done
                                        ? "text-success"
                                        : "text-muted-foreground"
                            )}
                        >
                            <span
                                className={cn(
                                    "grid size-6 place-items-center rounded-full border text-[11px] font-bold tabular-nums",
                                    active && "border-primary bg-primary text-primary-foreground",
                                    done && "border-success bg-success text-white",
                                    !active && !done && "border-border bg-card"
                                )}
                            >
                                {done ? <CheckCircle2 className="size-3.5" /> : i + 1}
                            </span>
                            {s.label}
                        </li>
                        {i < steps.length - 1 && (
                            <span
                                className={cn(
                                    "h-px w-8 sm:w-12",
                                    i < idx ? "bg-success" : "bg-border"
                                )}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </ol>
    );
}
