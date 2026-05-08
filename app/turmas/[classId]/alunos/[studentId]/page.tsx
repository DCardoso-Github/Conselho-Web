"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import NumberFlow from "@number-flow/react";
import { toast } from "sonner";
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Edit2,
    ImagePlus,
    Loader2,
    Save,
    X,
    AlertTriangle,
    Eye,
    EyeOff,
    Minus,
    Plus,
    StickyNote,
    CalendarX,
    CalendarCheck,
    CalendarRange,
    Activity,
    Play,
} from "lucide-react";
import { useClass, useStudents } from "@/lib/hooks";
import { isLowGrade, updateStudent, setStudentPhoto } from "@/lib/actions";
import { processPhoto } from "@/lib/photos";
import { type TotalLabel } from "@/lib/mapao/subjects";
import { formatSubject } from "@/lib/mapao/subjects";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { blobToObjectURL } from "@/lib/photos";

function formatValue(v: unknown): string {
    if (v === null || v === undefined) return "S/N";
    const s = String(v).trim();
    if (s === "" || s === "-") return "S/N";
    return s;
}

type Tone = "primary" | "danger" | "success" | "warn" | "neutral";

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

export default function AlunoPage({
    params,
}: {
    params: Promise<{ classId: string; studentId: string }>;
}) {
    const { classId: rawClass, studentId: rawId } = React.use(params);
    const classId = decodeURIComponent(rawClass);
    const studentId = parseInt(rawId, 10);

    const cls = useClass(classId);
    const allStudents = useStudents(classId);
    const router = useRouter();
    const [editing, setEditing] = React.useState(false);
    const [showAll, setShowAll] = React.useState(true);
    const [direction, setDirection] = React.useState<1 | -1>(1);

    const idx = React.useMemo(
        () => allStudents.findIndex((s) => s.id === studentId),
        [allStudents, studentId],
    );
    const student = idx >= 0 ? allStudents[idx] : undefined;

    const goTo = React.useCallback(
        (i: number) => {
            const s = allStudents[i];
            if (s?.id === undefined) return;
            setDirection(i > idx ? 1 : -1);
            setShowAll(true);
            router.push(`/turmas/${encodeURIComponent(classId)}/alunos/${s.id}`);
        },
        [allStudents, classId, router, idx],
    );

    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (editing) return;
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
            if ((e.key === "ArrowRight" || e.key === "ArrowDown") && idx < allStudents.length - 1)
                goTo(idx + 1);
            if ((e.key === "ArrowLeft" || e.key === "ArrowUp") && idx > 0) goTo(idx - 1);
            if (e.key === "Escape") router.push(`/turmas/${encodeURIComponent(classId)}`);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [idx, allStudents.length, editing, goTo, classId, router]);

    const [grades, setGrades] = React.useState<Record<string, string | number | null>>({});
    const [absences, setAbsences] = React.useState<Record<string, string | number | null>>({});
    React.useEffect(() => {
        if (student) {
            setGrades({ ...student.grades });
            setAbsences({ ...student.absences });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [student?.id]);

    const [saving, setSaving] = React.useState(false);
    const [notes, setNotes] = React.useState<string>("");
    const [notesStatus, setNotesStatus] = React.useState<"idle" | "saved">("idle");
    const notesTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const notesClearTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    React.useEffect(() => {
        setNotes(student?.notes ?? "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [student?.id]);
    const handleNotes = (v: string) => {
        setNotes(v);
        setNotesStatus("idle");
        if (notesTimer.current) clearTimeout(notesTimer.current);
        if (notesClearTimer.current) clearTimeout(notesClearTimer.current);
        notesTimer.current = setTimeout(async () => {
            if (student?.id !== undefined) {
                await updateStudent(student.id, { notes: v });
                setNotesStatus("saved");
                notesClearTimer.current = setTimeout(() => setNotesStatus("idle"), 2000);
            }
        }, 500);
    };

    if (!cls || !student) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-12 text-center text-muted-foreground">
                Carregando…
            </div>
        );
    }

    const subjects = cls.subjects;
    const lowSet = new Set(subjects.filter((s) => isLowGrade(student.grades[s])));
    const hasLow = lowSet.size > 0;

    const displaySubjects = editing
        ? subjects
        : showAll || !hasLow
            ? subjects
            : subjects.filter((s) => lowSet.has(s));

    const save = async () => {
        if (student.id === undefined) return;
        setSaving(true);
        try {
            await updateStudent(student.id, { grades, absences });
            toast.success("Notas e faltas salvas.");
            setEditing(false);
        } finally {
            setSaving(false);
        }
    };
    const cancel = () => {
        setGrades({ ...student.grades });
        setAbsences({ ...student.absences });
        setEditing(false);
    };

    const handleAddPhoto = async (file: File) => {
        if (student.id === undefined) return;
        try {
            const blob = await processPhoto(file);
            await setStudentPhoto(student.id, blob);
            toast.success("Foto adicionada.");
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    const totals = student.total ?? {};
    const sumAbsences = Object.values(student.absences).reduce<number>((acc, v) => {
        const n = Number(String(v ?? "").replace(",", "."));
        return Number.isNaN(n) ? acc : acc + n;
    }, 0);

    const progressPct = ((idx + 1) / allStudents.length) * 100;

    return (
        <div className="fixed inset-0 flex flex-col bg-background">
            <div className="flex items-center gap-2 px-3 sm:px-6 py-2.5 border-b border-border bg-card/60 backdrop-blur-sm shrink-0">
                <Button asChild variant="ghost" size="icon" aria-label="Voltar">
                    <Link href={`/turmas/${encodeURIComponent(classId)}`}>
                        <ArrowLeft className="size-4" />
                    </Link>
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goTo(idx - 1)}
                    disabled={idx <= 0}
                    aria-label="Anterior"
                >
                    <ChevronLeft className="size-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goTo(idx + 1)}
                    disabled={idx >= allStudents.length - 1}
                    aria-label="Próximo"
                >
                    <ChevronRight className="size-4" />
                </Button>
                <span className="text-xs text-muted-foreground ml-1 tabular-nums">
                    <NumberFlow value={idx + 1} /> / {allStudents.length}
                </span>
                <div className="ml-auto flex items-center gap-2">
                    <Button asChild variant="outline" size="sm" title="Apresentar a partir deste aluno">
                        <Link
                            href={`/turmas/${encodeURIComponent(classId)}/apresentar?from=${student.id}`}
                        >
                            <Play /> <span className="hidden sm:inline">Apresentar</span>
                        </Link>
                    </Button>
                    {hasLow && !editing && (
                        <Toggle
                            pressed={showAll}
                            onPressedChange={setShowAll}
                            size="sm"
                            aria-label="Mostrar todas"
                        >
                            {showAll ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                            <span className="hidden sm:inline">{showAll ? "Só vermelhas" : "Todas"}</span>
                        </Toggle>
                    )}
                    {!editing ? (
                        <Button onClick={() => setEditing(true)} size="sm">
                            <Edit2 /> <span className="hidden sm:inline">Editar</span>
                        </Button>
                    ) : (
                        <>
                            <Button variant="accent" onClick={save} size="sm" disabled={saving}>
                                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save />} Salvar
                            </Button>
                            <Button variant="ghost" onClick={cancel} size="sm" disabled={saving}>
                                <X /> Cancelar
                            </Button>
                        </>
                    )}
                </div>
            </div>
            <div className="h-1 bg-muted shrink-0">
                <motion.div
                    role="progressbar"
                    aria-valuenow={Math.round(progressPct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Progresso na turma"
                    className="h-full bg-gradient-to-r from-primary to-primary/60"
                    initial={false}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                />
            </div>

            <div className="flex-1 min-h-0 overflow-hidden relative">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={student.id}
                        custom={direction}
                        initial={{ opacity: 0, x: direction * 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -direction * 30 }}
                        transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                        className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6 lg:p-10 overflow-auto"
                    >
                        <div className="flex flex-col items-center justify-center gap-2 sm:gap-3 lg:gap-4 min-h-0">
                            <PhotoHero student={student} hasLow={hasLow} />
                            <h1 className="h-display text-2xl sm:text-3xl lg:text-4xl text-center max-w-full leading-tight">
                                {student.name}
                            </h1>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                {hasLow && (
                                    <Badge variant="destructive" className="gap-1">
                                        <AlertTriangle className="size-3" />
                                        {lowSet.size} vermelha{lowSet.size > 1 ? "s" : ""}
                                    </Badge>
                                )}
                                <Button asChild variant="outline" size="sm" className="cursor-pointer">
                                    <label>
                                        <ImagePlus className="size-3.5" />
                                        {student.photo ? "Trocar foto" : "Adicionar foto"}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            hidden
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) handleAddPhoto(f);
                                            }}
                                        />
                                    </label>
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-5">
                            {/* Heading */}
                            <div className="flex items-center gap-2">
                                {hasLow && !showAll && !editing && (
                                    <AlertTriangle className="size-4 text-destructive shrink-0" />
                                )}
                                <p className={cn(
                                    "text-sm uppercase font-bold tracking-wider",
                                    hasLow && !showAll && !editing
                                        ? "text-destructive"
                                        : "text-muted-foreground",
                                )}>
                                    {editing
                                        ? "Editar notas"
                                        : hasLow && !showAll
                                            ? `${lowSet.size} componente${lowSet.size > 1 ? "s" : ""} em vermelho`
                                            : "Disciplinas"}
                                </p>
                                <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
                                    {displaySubjects.length} / {subjects.length}
                                </span>
                            </div>

                            {/* Subject cards */}
                            {displaySubjects.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Sem disciplinas para mostrar.</p>
                            ) : (
                                <ul className={cn(
                                    "grid gap-2.5",
                                    editing
                                        ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                                        : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
                                )}>
                                    {displaySubjects.map((subject, i) => {
                                        const grade = editing ? grades[subject] : student.grades[subject];
                                        const absence = editing ? absences[subject] : student.absences[subject];
                                        const low = isLowGrade(grade);
                                        const absDisplay = formatValue(absence);
                                        return (
                                            <motion.li
                                                key={subject}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{
                                                    delay: Math.min(i * 0.04, 0.3),
                                                    duration: 0.3,
                                                }}
                                                className={cn(
                                                    "bg-card rounded-xl px-4 py-3 shadow-sm border border-border",
                                                    !editing && low && "border-l-4 border-l-destructive",
                                                )}
                                            >
                                                {editing ? (
                                                    <>
                                                        <div
                                                            className="text-sm font-semibold mb-2 truncate"
                                                            title={formatSubject(subject)}
                                                        >
                                                            {formatSubject(subject)}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <GradeStepper
                                                                value={grade}
                                                                isText={subject
                                                                    .toUpperCase()
                                                                    .startsWith("ESPORTE-MUSICA-ARTE")}
                                                                onChange={(v) =>
                                                                    setGrades((g) => ({
                                                                        ...g,
                                                                        [subject]: v,
                                                                    }))
                                                                }
                                                            />
                                                            <Input
                                                                className="h-7 text-center w-12"
                                                                placeholder="F"
                                                                value={absence ?? ""}
                                                                onChange={(e) =>
                                                                    setAbsences((a) => ({
                                                                        ...a,
                                                                        [subject]:
                                                                            e.target.value.trim() === ""
                                                                                ? null
                                                                                : e.target.value,
                                                                    }))
                                                                }
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span
                                                            className={cn(
                                                                "font-semibold truncate pr-2",
                                                                low && "text-destructive",
                                                            )}
                                                            title={formatSubject(subject)}
                                                        >
                                                            {formatSubject(subject)}
                                                        </span>
                                                        <div className="flex flex-col items-end shrink-0">
                                                            <span
                                                                className={cn(
                                                                    "text-2xl font-extrabold tabular-nums leading-none",
                                                                    low
                                                                        ? "text-destructive"
                                                                        : "text-foreground",
                                                                )}
                                                            >
                                                                {formatValue(grade)}
                                                            </span>
                                                            {absDisplay !== "S/N" && (
                                                                <span className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                                                                    {absDisplay}F
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.li>
                                        );
                                    })}
                                </ul>
                            )}

                            {/* Notes */}
                            <div className="rounded-xl border-l-4 border-l-accent border border-border bg-card p-4">
                                <div className="flex items-center gap-2 text-[11px] uppercase font-bold text-muted-foreground mb-1.5">
                                    <StickyNote className="size-3.5" /> Anotação do conselho
                                    {notesStatus === "saved" && (
                                        <span role="status" aria-live="polite" className="ml-auto text-[10px] font-normal text-success normal-case">
                                            Salvo
                                        </span>
                                    )}
                                </div>
                                <label htmlFor="student-notes" className="sr-only">Anotação do conselho</label>
                                <textarea
                                    id="student-notes"
                                    className="w-full min-h-[60px] max-h-[120px] resize-y bg-transparent text-sm outline-none focus:ring-2 focus:ring-ring rounded-lg px-2 py-1.5"
                                    value={notes}
                                    onChange={(e) => handleNotes(e.target.value)}
                                    placeholder="Observações registradas durante o conselho…"
                                />
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="bg-card border-t border-border px-3 sm:px-6 py-2.5 shrink-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 justify-center items-stretch gap-2 mx-auto max-w-5xl">
                    <FrequencyStat
                        icon={<CalendarX className="size-4" />}
                        label="Faltas bim."
                        value={fmtNum(totals["TF" as TotalLabel] ?? sumAbsences)}
                        tone="danger"
                    />
                    <FrequencyStat
                        icon={<Activity className="size-4" />}
                        label="Freq. bim."
                        value={fmtPct(totals["FRE(%)" as TotalLabel])}
                        tone={pctTone(totals["FRE(%)" as TotalLabel])}
                    />
                    <FrequencyStat
                        icon={<CalendarRange className="size-4" />}
                        label="Faltas ano"
                        value={fmtNum(totals["FT AN" as TotalLabel])}
                        tone="warn"
                    />
                    <FrequencyStat
                        icon={<CalendarCheck className="size-4" />}
                        label="Freq. anual"
                        value={fmtPct(totals["FRE AN(%)" as TotalLabel])}
                        tone={pctTone(totals["FRE AN(%)" as TotalLabel])}
                    />
                </div>
            </div>
        </div>
    );
}

function PhotoHero({
    student,
    hasLow,
}: {
    student: { id?: number; name: string; photo?: Blob };
    hasLow: boolean;
}) {
    const [url, setUrl] = React.useState<string | null>(null);
    React.useEffect(() => {
        if (!student.photo) {
            setUrl(null);
            return;
        }
        const u = blobToObjectURL(student.photo);
        setUrl(u);
        return () => {
            if (u) URL.revokeObjectURL(u);
        };
    }, [student.photo]);

    if (student.photo && url) {
        return (
            <motion.img
                layoutId={`student-photo-${student.id}`}
                src={url}
                alt={student.name}
                className={cn(
                    "size-36 sm:size-52 lg:size-80 xl:size-96 rounded-3xl object-cover shadow-xl border-4 shrink-0",
                    hasLow ? "border-destructive/70" : "border-primary/40",
                )}
            />
        );
    }
    return (
        <Avatar
            name={student.name}
            size="2xl"
            rounded="lg"
            className="!size-36 !text-5xl sm:!size-52 sm:!text-7xl lg:!size-80 lg:!text-8xl xl:!size-96 shadow-xl shrink-0"
        />
    );
}

function GradeStepper({
    value,
    isText,
    onChange,
}: {
    value: string | number | null | undefined;
    isText: boolean;
    onChange: (v: string | number | null) => void;
}) {
    if (isText) {
        return (
            <Input
                className="h-8 text-center w-24"
                value={value == null ? "" : String(value)}
                onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
            />
        );
    }
    const display = value === null || value === undefined || value === "" ? "S/N" : String(value);
    const num = (() => {
        const n = Number(String(value).replace(",", "."));
        return Number.isNaN(n) ? null : n;
    })();
    const dec = () => {
        if (num === null) return onChange(0);
        if (num > 0) onChange(num - 1);
    };
    const inc = () => {
        if (num === null) return onChange(0);
        if (num < 10) onChange(num + 1);
    };
    return (
        <div className="inline-flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={dec} type="button" aria-label="−">
                <Minus className="size-3.5" />
            </Button>
            <span className="inline-block w-12 py-1 bg-card border border-border rounded text-sm font-bold tabular-nums text-center">
                {display}
            </span>
            <Button variant="outline" size="icon-sm" onClick={inc} type="button" aria-label="+">
                <Plus className="size-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onChange(null)} type="button">
                S/N
            </Button>
        </div>
    );
}

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
                style={{ background: `color-mix(in srgb, ${c} 16%, transparent)`, color: c }}
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