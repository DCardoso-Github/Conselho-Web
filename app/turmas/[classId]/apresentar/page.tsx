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
    StickyNote,
} from "lucide-react";
import { useClass, useStudents } from "@/lib/hooks";
import { isLowGrade } from "@/lib/actions";
import { Avatar } from "@/components/avatar";
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
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-primary to-primary/70 text-primary-foreground shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-xl bg-white/15 backdrop-blur-sm">
                        <Sparkles className="size-5 opacity-90" />
                    </div>
                    <div>
                        <div className="font-bold text-lg leading-tight tracking-tight">
                            {cls.name}
                        </div>
                        <div className="text-[11px] opacity-85 inline-flex items-center gap-1 tabular-nums">
                            <NumberFlow value={idx + 1} /> / {list.length}
                            {lowOnly.length > 0 ? " · alunos com nota vermelha" : ""}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExitConfirmOpen(true)}
                        className="text-primary-foreground hover:bg-white/15"
                        aria-label="Sair da apresentação"
                    >
                        <X className="size-5" />
                    </Button>
                </div>
            </div>
            <div className="h-1 bg-muted">
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

            {/* Conteúdo (foto + info) */}
            <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={student.id}
                        custom={direction}
                        initial={{ opacity: 0, x: direction * 60 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -direction * 60 }}
                        transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
                        className="absolute inset-0 grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-8 p-6 lg:p-12 items-center overflow-auto"
                    >
                        <div className="flex justify-center">
                            {student.photo ? (
                                <PhotoFrame
                                    photo={student.photo}
                                    name={student.name}
                                    hasLow={lowSubjects.length > 0}
                                />
                            ) : (
                                <div className="w-full max-w-[520px] aspect-square rounded-3xl flex items-center justify-center">
                                    <Avatar
                                        name={student.name}
                                        size="2xl"
                                        rounded="full"
                                        className="!w-[min(480px,75vw)] !h-[min(480px,75vw)] !text-[clamp(2rem,14vw,6rem)] shadow-2xl"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="space-y-6 max-w-4xl w-full flex flex-col items-center text-center">
                            <motion.h1
                                key={student.name}
                                className="h-display text-foreground text-3xl sm:text-4xl lg:text-5xl"
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
                            >
                                {student.name}
                            </motion.h1>

                            {lowSubjects.length > 0 ? (
                                <div className="w-full">
                                    <p className="text-xl uppercase font-bold tracking-wider text-destructive mb-3 flex items-center justify-center gap-2">
                                        <span className="pulse-danger rounded-full p-0.5 flex items-center justify-center">
                                            <AlertTriangle className="size-5" />
                                        </span>
                                        {lowSubjects.length} componente
                                        {lowSubjects.length > 1 ? "s" : ""} em vermelho
                                    </p>
                                    <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                        {lowSubjects.map(([subj, val], i) => {
                                            const absDisplay = fmtNum(student.absences[subj]);
                                            return (
                                                <motion.li
                                                    key={subj}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{
                                                        delay: 0.15 + i * 0.05,
                                                        duration: 0.3,
                                                    }}
                                                    className="flex items-center justify-between bg-card rounded-xl px-5 py-4 border-l-4 border-l-destructive shadow-sm"
                                                >
                                                    <span
                                                        className="text-base font-semibold truncate pr-2"
                                                        title={formatSubject(subj)}
                                                    >
                                                        {formatSubject(subj)}
                                                    </span>
                                                    <div className="flex flex-col items-end shrink-0">
                                                        <span className="text-5xl font-extrabold text-destructive tabular-nums leading-none">
                                                            {String(val)}
                                                        </span>
                                                        {absDisplay !== "—" && (
                                                            <span className="text-sm text-muted-foreground tabular-nums mt-0.5">
                                                                {absDisplay}F
                                                            </span>
                                                        )}
                                                    </div>
                                                </motion.li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ) : (
                                <p className="text-2xl text-success font-semibold flex items-center gap-2">
                                    <CalendarCheck className="size-6" /> Sem nota vermelha.
                                </p>
                            )}

                            {student.notes && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25, duration: 0.3 }}
                                    className="rounded-xl border-l-4 border-l-accent bg-card p-4 text-sm whitespace-pre-wrap shadow-sm"
                                >
                                    <div className="flex items-center gap-2 text-[11px] uppercase font-bold text-muted-foreground mb-1.5">
                                        <StickyNote className="size-3.5" /> Anotação
                                    </div>
                                    {student.notes}
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer: faltas / frequência + nav */}
            <div className="bg-card border-t border-border px-4 lg:px-6 py-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 justify-center items-stretch gap-2 mb-3 mx-auto max-w-5xl">
                    <FrequencyStat
                        icon={<CalendarX className="size-4" />}
                        label="Faltas no bimestre"
                        value={fmtNum(totals["TF" as TotalLabel] ?? sumAbsences)}
                        tone="danger"
                    />
                    <FrequencyStat
                        icon={<Activity className="size-4" />}
                        label="Frequência bim."
                        value={fmtPct(totals["FRE(%)" as TotalLabel])}
                        tone={pctTone(totals["FRE(%)" as TotalLabel])}
                    />
                    <FrequencyStat
                        icon={<CalendarRange className="size-4" />}
                        label="Faltas no ano"
                        value={fmtNum(totals["FT AN" as TotalLabel])}
                        tone="warn"
                    />
                    <FrequencyStat
                        icon={<CalendarCheck className="size-4" />}
                        label="Frequência anual"
                        value={fmtPct(totals["FRE AN(%)" as TotalLabel])}
                        tone={pctTone(totals["FRE AN(%)" as TotalLabel])}
                    />
                </div>

                <div className="flex items-center justify-between gap-2">
                    <Button
                        variant="outline"
                        onClick={() => go(idx - 1)}
                        disabled={idx === 0}
                    >
                        <ChevronLeft /> Anterior
                    </Button>
                    <p className="text-[11px] text-muted-foreground hidden md:block">
                        ← / → ou espaço · ESC sair
                    </p>
                    <Button
                        onClick={() => go(idx + 1)}
                        disabled={idx >= list.length - 1}
                    >
                        Próximo <ChevronRight />
                    </Button>
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
}: {
    photo: Blob;
    name: string;
    hasLow: boolean;
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
                "w-full max-w-[560px] aspect-square rounded-3xl overflow-hidden bg-card shadow-2xl border-4 transition-colors",
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
            <div
                className="stat-icon"
                style={{
                    background: `color-mix(in srgb, ${c} 16%, transparent)`,
                    color: c,
                }}
            >
                {icon}
            </div>
            <div className="min-w-0">
                <div className="stat-label">{label}</div>
                <div className="stat-value">{value}</div>
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
    if (n >= 75) return "success";
    if (n >= 60) return "warn";
    return "danger";
}
