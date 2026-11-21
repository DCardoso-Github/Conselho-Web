"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import {
    CheckCircle2,
    XCircle,
    Loader2,
    ArrowRight,
    ArrowLeft,
    FileSpreadsheet,
    Trash2,
} from "lucide-react";
import type { SchoolPeriod } from "@/lib/db";
import { PeriodFields } from "@/components/period-fields";
import { periodLabel } from "@/lib/evolution";
import { detectMapaoPeriod } from "@/lib/mapao/period";
import { importMapaoFile } from "@/lib/actions";
import { useClasses } from "@/lib/hooks";
import { ClassImportDialog } from "@/components/class-import-dialogs";
import { importOptions, type ImportKind } from "@/components/import-options";
import { FileDrop } from "@/components/file-drop";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    const classes = useClasses();
    const reduceMotion = useReducedMotion();
    const [kind, setKind] = React.useState<ImportKind>("map");
    const [chosenClass, setChosenClass] = React.useState("");
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const classId = classes.some(cls => cls.id === chosenClass) ? chosenClass : classes.length === 1 ? classes[0].id : "";
    const [step, setStep] = React.useState<Step>("select");
    const [files, setFiles] = React.useState<{ file: File; period: SchoolPeriod; suggestion: string }[]>([]);
    const [busy, setBusy] = React.useState(false);
    const [results, setResults] = React.useState<FileResult[]>([]);
    const [replace, setReplace] = React.useState(false);
    const [progress, setProgress] = React.useState(0);

    const onPicked = async (picked: File[]) => {
        setBusy(true);
        const reviewed = await Promise.all(picked.map(async file => {
            try {
                const suggestion = detectMapaoPeriod(file.name, await file.arrayBuffer());
                return { file, period: { year: new Date().getFullYear(), term: 0, ...suggestion.period }, suggestion: suggestion.message };
            } catch {
                return { file, period: { year: new Date().getFullYear(), term: 0 }, suggestion: "Não foi possível identificar o período. Confira o arquivo e selecione o bimestre." };
            }
        }));
        setFiles(reviewed);
        setReplace(false);
        setBusy(false);
        setStep("review");
    };

    const removeFile = (index: number) => {
        setFiles(previous => previous.filter((_, i) => i !== index));
        if (files.length === 1) { setStep("select"); setReplace(false); }
    };

    const startImport = async () => {
        setBusy(true);
        setProgress(0);
        const out: FileResult[] = [];
        let i = 0;
        for (const { file: f, period } of files) {
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
        <div className="console-container import-screen">
            <header className="focus-heading"><div><h1>Importar dados</h1></div></header>
            <div className="import-workspace">
              <nav className="import-choices import-navigation" aria-label="Tipo de importação">
                {importOptions.map(({value, label, detail, icon: Icon}) => (
                  <button key={value} type="button" aria-current={kind === value ? "true" : undefined} disabled={busy} onClick={() => setKind(value)}>
                    <span className="choice-symbol"><Icon /></span><span><strong>{label}</strong><small>{detail}</small></span>
                  </button>
                ))}
              </nav>
              <section className="import-canvas" aria-label="Arquivo e destino">
                {kind === "map" ? <>
                  <div className="import-step-heading">
                    <h2>{step === "select" ? "Selecionar mapão" : step === "review" ? "Revisar arquivos" : "Resultado da importação"}</h2>
                    <span>Etapa {step === "select" ? 1 : step === "review" ? 2 : 3} de 3</span>
                  </div>
                <AnimatePresence mode="wait">
                    {step === "select" && (
                        <motion.div
                            key="select"
                            initial={reduceMotion ? false : { opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            transition={{ duration: reduceMotion ? 0 : 0.18 }}
                        >
                            <FileDrop
                                accept={{
                                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                                        [".xlsx"],
                                }}
                                onFiles={onPicked}
                                disabled={busy}
                                label={busy ? "Identificando os bimestres…" : "Selecionar planilhas XLSX"}
                                hint="Arraste os mapões ou escolha os arquivos. A turma é identificada pelo nome da planilha."
                                icon={<FileSpreadsheet className="size-6" />}
                            />
                            <Button variant="link" asChild className="mt-3">
                                <a href="/MAPAO_6_ANO_A_2026_1BIM.xlsx" download>Baixar mapão fictício para testar</a>
                            </Button>
                        </motion.div>
                    )}

                    {step === "review" && (
                        <motion.div
                            key="review"
                            initial={reduceMotion ? false : { opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            transition={{ duration: reduceMotion ? 0 : 0.18 }}
                            className="space-y-4"
                        >
                            <p className="supporting-text">Confira o período de cada arquivo. Bimestres anteriores ficam no histórico; o mais recente aparece na turma. Os alunos serão organizados em ordem alfabética.</p>
                            <label className="check-row"><input type="checkbox" checked={replace} disabled={busy} onChange={(event) => setReplace(event.target.checked)} />Atualizar este bimestre se ele já estiver salvo. Os outros bimestres serão mantidos.</label>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
                                        {files.length} arquivo(s) selecionado(s)
                                    </div>
                                    <ul className="divide-y divide-border">
                                        {files.map(({ file: f, period, suggestion }, index) => (
                                            <li
                                                key={index}
                                                className="import-file-review"
                                            >
                                                <FileSpreadsheet className="size-4 text-primary shrink-0" />
                                                <div className="min-w-0 flex-1 review-file-data">
                                                    <div>
                                                    <div className="font-medium break-words">
                                                        {f.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {(f.size / 1024).toFixed(1)} KB
                                                    </div>
                                                    <p className="supporting-text period-suggestion">{suggestion}</p>
                                                    </div>
                                                    <PeriodFields value={period} onChange={value => { setFiles(previous => previous.map((entry, i) => i === index ? { ...entry, period: value } : entry)); setReplace(false); }} disabled={busy} label={`Período · ${f.name}`} />
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => removeFile(index)}
                                                    disabled={busy}
                                                    aria-label={`Remover ${f.name}`}
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
                                    disabled={busy || files.length === 0 || files.some(({ period }) => period.term < 1 || period.term > 4 || period.year < 2000 || period.year > 2100 || !Number.isInteger(period.year))}
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
                            initial={reduceMotion ? false : { opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            transition={{ duration: reduceMotion ? 0 : 0.18 }}
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
                </> : <>
                  <div className="import-step-heading"><h2>{importOptions.find(option => option.value === kind)?.label}</h2></div>
                  {classes.length ? <div className="import-destination">
                    <label className="form-field">Turma
                      <select value={classId} onChange={event => setChosenClass(event.target.value)}>
                        <option value="">Escolher turma</option>
                        {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                      </select>
                    </label>
                    <p>{kind === "photo" ? "As fotos serão associadas aos alunos desta turma pelo nome do arquivo." : "Ao abrir a planilha, você poderá conferir a turma de destino de cada aba."}</p>
                    <Button size="lg" disabled={!classId} onClick={() => setDialogOpen(true)}>Escolher arquivos</Button>
                  </div> : <div className="empty-panel"><p>Importe um mapão para cadastrar a primeira turma.</p>
                    <Button onClick={() => setKind("map")}>Importar primeiro mapão</Button></div>}
                  {dialogOpen && classId && <ClassImportDialog kind={kind} classId={classId} onClose={() => setDialogOpen(false)} />}
                </>}
              </section>
            </div>
        </div>
    );
}
