"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import NumberFlow from "@number-flow/react";
import {
    ChevronLeft,
    ChevronRight,
    X,
    AlertTriangle,
    CalendarX,
    CalendarCheck,
    CalendarRange,
    Activity,
    Sparkles,
    GraduationCap,
    CheckCircle2,
    ClipboardList,
} from "lucide-react";
import { useClass, useStudents } from "@/lib/hooks";
import { isLowGrade } from "@/lib/actions";
import { Avatar } from "@/components/avatar";
import { SubjectIcon } from "@/components/subject-icon";
import { TOTAL_LABELS, formatSubject, type TotalLabel } from "@/lib/mapao/subjects";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { blobToObjectURL } from "@/lib/photos";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function ApresentarPage({
    params,
}: {
    params: Promise<{ classId: string }>;
}) {
    const { classId: rawId } = React.use(params);
    const classId = decodeURIComponent(rawId);
    const router = useRouter();
    const searchParams = useSearchParams();
    const fromId = searchParams.get("from");
    const cls = useClass(classId);
    const all = useStudents(classId);

    const lowOnly = React.useMemo(
        () => all.filter((s) => Object.values(s.grades).some((g) => isLowGrade(g))),
        [all]
    );
    const list = lowOnly.length > 0 ? lowOnly : all;
    const [idx, setIdx] = React.useState(0);
    const [direction, setDirection] = React.useState<1 | -1>(1);
    const [exitConfirmOpen, setExitConfirmOpen] = React.useState(false);
    const doExit = React.useCallback(() => {
        router.push(`/turmas/${encodeURIComponent(classId)}`);
    }, [router, classId]);
    const initFromRef = React.useRef(false);
    React.useEffect(() => {
        if (initFromRef.current || !fromId || list.length === 0) return;
        const target = parseInt(fromId, 10);
        const found = list.findIndex((s) => s.id === target);
        if (found >= 0) setIdx(found);
        initFromRef.current = true;
    }, [fromId, list]);

    const go = React.useCallback(
        (next: number) => {
            const clamped = Math.max(0, Math.min(list.length - 1, next));
            if (clamped === idx) return;
            setDirection(clamped > idx ? 1 : -1);
            setIdx(clamped);
        },
        [idx, list.length]
    );

    React.useEffect(() => {
        document.documentElement.requestFullscreen?.().catch(() => { });
        return () => {
            if (document.fullscreenElement)
                document.exitFullscreen?.().catch(() => { });
        };
    }, []);

    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setExitConfirmOpen(true);
            }
            if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
                e.preventDefault();
                go(idx + 1);
            }
            if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                go(idx - 1);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [idx, classId, router, go]);

    if (!cls) return null;
    if (list.length === 0) {
        return (
            <div className="fixed inset-0 bg-background text-foreground flex flex-col items-center justify-center gap-4">
                <p className="text-2xl">Sem alunos.</p>
                <Button
                    variant="outline"
                    onClick={() =>
                        router.push(`/turmas/${encodeURIComponent(classId)}`)
                    }
                >
                    Voltar
                </Button>
            </div>
        );
    }

    const student = list[idx];
    const lowSubjects = Object.entries(student.grades).filter(([, v]) =>
        isLowGrade(v)
    );
    const progressPct = ((idx + 1) / list.length) * 100;
    const totals = student.total ?? {};

    const sumAbsences = Object.values(student.absences).reduce<number>(
        (acc, v) => {
            const n = Number(String(v ?? "").replace(",", "."));
            return Number.isNaN(n) ? acc : acc + n;
        },
        0
    );

    return (
        <div className="fixed inset-0 bg-background z-50 flex flex-col select-none">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3.5 bg-card text-card-foreground border-b border-border shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <div className="grid size-10 place-items-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-inner">
                        <Sparkles className="size-5.5" />
                    </div>
                    <div>
                        <div className="font-extrabold text-base sm:text-lg leading-tight tracking-tight text-foreground flex items-center gap-2">
                            {cls.name}
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive/20 animate-pulse">
                                {lowOnly.length > 0 ? "Filtro Vermelhas" : "Modo Completo"}
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground font-medium">
                            Conselho de Classe • {list.length} Alunos
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-2 bg-muted border border-border rounded-xl p-1 shadow-inner">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => go(idx - 1)}
                            disabled={idx === 0}
                            className="h-8 text-xs font-bold gap-1 bg-transparent hover:bg-muted-foreground/10 disabled:opacity-30 border-0 text-foreground rounded-lg cursor-pointer"
                        >
                            <ChevronLeft className="size-4.5" /> Anterior
                        </Button>
                        <div className="h-4 w-px bg-border" />
                        <span className="text-xs text-foreground font-bold tabular-nums px-3 select-none">
                            <NumberFlow value={idx + 1} /> / {list.length}
                        </span>
                        <div className="h-4 w-px bg-border" />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => go(idx + 1)}
                            disabled={idx >= list.length - 1}
                            className="h-8 text-xs font-bold gap-1 bg-transparent hover:bg-muted-foreground/10 disabled:opacity-30 border-0 text-foreground rounded-lg cursor-pointer"
                        >
                            Próximo <ChevronRight className="size-4.5" />
                        </Button>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExitConfirmOpen(true)}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted border border-border rounded-xl size-10 ml-2 cursor-pointer transition-colors"
                        aria-label="Sair da apresentação"
                    >
                        <X className="size-5.5" />
                    </Button>
                </div>
            </div>
            <div className="h-1 bg-muted shrink-0">
                <motion.div
                    role="progressbar"
                    aria-valuenow={Math.round(progressPct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Progresso da apresentação"
                    className="h-full bg-gradient-to-r from-primary to-primary/60"
                    initial={false}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                />
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-hidden relative min-h-0 bg-background/50">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={student.id}
                        custom={direction}
                        initial={{ opacity: 0, x: direction * 60 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -direction * 60 }}
                        transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
                        className="absolute inset-0 flex flex-col md:flex-row p-6 sm:p-8 lg:p-10 gap-8 justify-between min-h-0"
                    >
                        {/* Left Side: Profile (Photo & Name) */}
                        <div className="flex flex-col items-center gap-4 bg-muted/30 p-5 sm:p-6 rounded-2xl border border-border/80 shrink-0 w-full md:w-[280px] lg:w-[360px] xl:w-[440px] animate-fade-in justify-center">
                            {/* Photo / Avatar */}
                            <div className="shrink-0 shadow-md rounded-2xl overflow-hidden w-full max-w-[240px] md:max-w-none">
                                {student.photo ? (
                                    <PhotoFrame
                                        photo={student.photo}
                                        name={student.name}
                                        hasLow={lowSubjects.length > 0}
                                        maxW="max-w-[240px] sm:max-w-[320px] lg:max-w-[400px]"
                                    />
                                ) : (
                                    <div className={cn("w-full aspect-square rounded-2xl flex items-center justify-center bg-card shadow-sm border-2 transition-colors", lowSubjects.length > 0 ? "border-destructive" : "border-primary")}>
                                        <Avatar
                                            name={student.name}
                                            size="xl"
                                            rounded="lg"
                                            className="shadow-sm !w-full !h-full"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Name */}
                            <div className="flex flex-col gap-1 min-w-0 w-full text-center mt-2">
                                <motion.h1
                                    key={student.name}
                                    className="text-foreground text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-snug whitespace-normal break-words max-w-full text-center"
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.35, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
                                >
                                    {student.name}
                                </motion.h1>
                            </div>
                        </div>

                        {/* Right Side: List of Red Subjects Column */}
                        <div className="flex-1 flex flex-col justify-center w-full gap-5 min-w-0">
                            {lowSubjects.length > 0 ? (
                                <div className="space-y-4 flex-1 flex flex-col">
                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 border-b border-border/60 pb-3 shrink-0 text-center">
                                        <h2 className="text-lg sm:text-xl uppercase font-black tracking-wider text-destructive flex items-center gap-2.5 justify-center">
                                            <AlertTriangle className="size-5.5 shrink-0" />
                                            Componentes em Recuperação
                                        </h2>
                                        <span className="px-3.5 py-1 bg-destructive/10 text-destructive border border-destructive/20 text-xs sm:text-sm font-extrabold rounded-full">
                                            {lowSubjects.length} Disciplina{lowSubjects.length > 1 ? "s" : ""}
                                        </span>
                                    </div>
                                    <div className="w-full overflow-visible">
                                        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 w-full pb-4">
                                            {lowSubjects.map(([subj, val], i) => (
                                                <motion.li
                                                    key={subj}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{
                                                        delay: 0.1 + i * 0.03,
                                                        duration: 0.35,
                                                        ease: [0.2, 0.8, 0.2, 1],
                                                    }}
                                                    className="flex flex-col items-center justify-center gap-2 bg-card rounded-2xl px-4 py-3.5 border-2 border-border border-l-[5px] border-l-destructive shadow-md hover:shadow-lg transition-all animate-fade-in text-center"
                                                >
                                                    <span
                                                        className="font-black text-lg sm:text-xl text-foreground uppercase tracking-wider truncate flex items-center gap-2 justify-center w-full min-w-0"
                                                        title={formatSubject(subj)}
                                                    >
                                                        <SubjectIcon name={subj} className="size-5.5 sm:size-6 shrink-0" />
                                                        <span className="truncate">{formatSubject(subj)}</span>
                                                    </span>
                                                    <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-destructive tabular-nums leading-none mt-1">
                                                        {String(val)}
                                                    </span>
                                                </motion.li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-3 text-center p-12 bg-success/5 border border-success/15 rounded-3xl flex-1">
                                    <div className="grid size-20 place-items-center rounded-full bg-success/10 text-success mb-2 border border-success/20 shadow-md">
                                        <CalendarCheck className="size-10" />
                                    </div>
                                    <h2 className="text-2xl font-black text-foreground">Desempenho Excelente</h2>
                                    <p className="text-base text-muted-foreground max-w-md">
                                        Este(a) aluno(a) não possui nenhuma nota vermelha cadastrada neste bimestre. Parabéns pelo desempenho!
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer: Stats */}
            <div className="bg-card border-t border-border px-3 sm:px-6 py-2.5 shrink-0 flex flex-col gap-2 shadow-lg animate-fade-in">
                {student.outrasInformacoes && (
                    <div className="text-[11px] sm:text-xs text-muted-foreground max-w-5xl mx-auto w-full text-center border-b border-border/40 pb-1.5 leading-relaxed">
                        <span className="font-bold text-foreground mr-1.5">Observações do Conselho:</span>
                        {student.outrasInformacoes}
                    </div>
                )}
                <div className="flex flex-row flex-nowrap justify-center items-stretch gap-2.5 mx-auto max-w-full w-full overflow-x-auto select-none py-1">
                    {student.tutor && (
                        <FrequencyStat
                            icon={<GraduationCap className="size-4" />}
                            label="Tutor(a)"
                            value={student.tutor}
                            tone="primary"
                        />
                    )}
                    <FrequencyStat
                        icon={<CalendarCheck className="size-4" />}
                        label="Frequência anual"
                        value={formatPercentage(student.frequenciaAnual, "—")}
                        tone={pctTone(student.frequenciaAnual)}
                    />
                    <FrequencyStat
                        icon={<Activity className="size-4" />}
                        label="Participação PP"
                        value={student.provaPaulista ? formatPercentage(student.provaPaulista.participacao, "—") : "—"}
                        tone="primary"
                    />
                    <FrequencyStat
                        icon={<CheckCircle2 className="size-4" />}
                        label="Acertos PP"
                        value={student.provaPaulista ? formatPercentage(student.provaPaulista.acertos, "—") : "—"}
                        tone={(() => {
                            if (!student.provaPaulista || student.provaPaulista.acertos == null) return "neutral";
                            let n = Number(String(student.provaPaulista.acertos).replace(",", "."));
                            if (Number.isNaN(n)) return "neutral";
                            if (n > 0 && n <= 1) n *= 100;
                            return n >= 50 ? "success" : "danger";
                        })()}
                    />
                    {student.educacaoEspecial && (
                        <FrequencyStat
                            icon={<AlertTriangle className="size-4" />}
                            label="Ed. Especial"
                            value={student.educacaoEspecial}
                            tone="warn"
                        />
                    )}
                    {(student.tutoriaMatematica || student.tutoriaPortugues || student.programaSouMais) && (
                        <FrequencyStat
                            icon={<ClipboardList className="size-4" />}
                            label="Acompanhamento"
                            value={(() => {
                                const active = [];
                                if (student.tutoriaMatematica) active.push("TT MAT");
                                if (student.tutoriaPortugues) active.push("TT PORT");
                                if (student.programaSouMais) active.push("SOU+");
                                return active.join(" • ");
                            })()}
                            tone="primary"
                        />
                    )}
                </div>
            </div>
            <ConfirmDialog
                open={exitConfirmOpen}
                onOpenChange={setExitConfirmOpen}
                title="Sair da apresentação?"
                description="Você será redirecionado para a página da turma."
                confirmLabel="Sair"
                onConfirm={doExit}
            />
        </div>
    );
}

function PhotoFrame({
    photo,
    name,
    hasLow,
    maxW = "max-w-[560px]",
}: {
    photo: Blob;
    name: string;
    hasLow: boolean;
    maxW?: string;
}) {
    const [url, setUrl] = React.useState<string | null>(null);
    React.useEffect(() => {
        const u = blobToObjectURL(photo);
        setUrl(u);
        return () => {
            if (u) URL.revokeObjectURL(u);
        };
    }, [photo]);

    return (
        <div
            className={cn(
                "w-full aspect-square rounded-xl overflow-hidden bg-card shadow-md border-2 transition-colors",
                maxW,
                hasLow ? "border-destructive" : "border-primary"
            )}
        >
            {url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={url}
                    alt={name}
                    className="w-full h-full object-cover"
                />
            )}
        </div>
    );
}

type Tone = "primary" | "danger" | "success" | "warn" | "neutral";

function FrequencyStat({
    icon,
    label,
    value,
    tone,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    tone: Tone;
}) {
    const colorMap: Record<Tone, string> = {
        primary: "var(--primary)",
        danger: "var(--danger)",
        success: "var(--success)",
        warn: "var(--warning)",
        neutral: "var(--muted-foreground)",
    };
    const c = colorMap[tone];
    return (
        <div className="stat">
            <div className="flex items-center gap-1.5 justify-center w-full min-w-0">
                <div
                    className="flex items-center justify-center shrink-0 rounded bg-muted/60 p-0.5"
                    style={{
                        background: `color-mix(in srgb, ${c} 12%, transparent)`,
                        color: c
                    }}
                >
                    {React.isValidElement(icon) ? React.cloneElement(icon as any, { className: "size-3 shrink-0" }) : icon}
                </div>
                <div className="stat-label truncate">{label}</div>
            </div>
            <div className="stat-value text-center w-full truncate" title={value}>
                {value}
            </div>
        </div>
    );
}

function fmtNum(v: unknown): string {
    if (v === null || v === undefined || v === "") return "—";
    const s = String(v).trim();
    if (s === "" || s === "-") return "—";
    const n = Number(s.replace(",", "."));
    if (Number.isNaN(n)) return s;
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

function fmtPct(v: unknown): string {
    if (v === null || v === undefined || v === "") return "—";
    const n = Number(String(v).replace(",", "."));
    if (Number.isNaN(n)) return String(v);
    return `${n.toFixed(1).replace(".", ",")}%`;
}

function pctTone(v: unknown): Tone {
    if (v === null || v === undefined || v === "") return "neutral";
    const n = Number(String(v).replace(",", "."));
    if (Number.isNaN(n)) return "neutral";
    let val = n;
    if (val > 0 && val <= 1) {
        val = val * 100;
    }
    if (val >= 75) return "success";
    if (val >= 60) return "warn";
    return "danger";
}

function formatPercentage(grade: unknown, fallback = "S/N"): string {
    if (grade === null || grade === undefined) return fallback;
    const s = String(grade).trim();
    if (s === "" || s === "-") return fallback;
    const n = Number(s.replace(",", "."));
    if (Number.isNaN(n)) {
        return s.endsWith("%") ? s : `${s}%`;
    }
    let val = n;
    if (val > 0 && val <= 1) {
        val = val * 100;
    }
    const formatted = Number.isInteger(val) ? String(val) : val.toFixed(1).replace(".", ",");
    return `${formatted}%`;
}
