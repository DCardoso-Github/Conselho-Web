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
    CalendarX,
    CalendarCheck,
    CalendarRange,
    Activity,
    Play,
    CheckCircle2,
    GraduationCap,
    ClipboardList,
} from "lucide-react";
import { useClass, useStudents } from "@/lib/hooks";
import { isLowGrade, updateStudent, setStudentPhoto } from "@/lib/actions";
import { processPhoto } from "@/lib/photos";
import { type TotalLabel } from "@/lib/mapao/subjects";
import { formatSubject } from "@/lib/mapao/subjects";
import { Avatar } from "@/components/avatar";
import { SubjectIcon } from "@/components/subject-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { blobToObjectURL } from "@/lib/photos";

function formatValue(v: unknown): string {
    if (v === null || v === undefined) return "S/N";
    const s = String(v).trim();
    if (s === "" || s === "-") return "S/N";
    return s;
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
    let val = n;
    if (val > 0 && val <= 1) {
        val = val * 100;
    }
    if (val >= 75) return "success";
    if (val >= 60) return "warn";
    return "danger";
}

const PP_SUBJECT_NAMES: Record<string, string> = {
    MAT: "Matemática",
    PORT: "Língua Portuguesa",
    ING: "Língua Inglesa",
    HIST: "História",
    GEO: "Geografia",
    CIE: "Ciências",
    FIN: "Educação Financeira",
    TEC: "Tecnologia e Inovação",
};

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
    const [viewMode, setViewMode] = React.useState<"bimestre" | "provaPaulista">("bimestre");

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

    const [menuOpen, setMenuOpen] = React.useState(false);
    const [tempTutor, setTempTutor] = React.useState("");
    const [tempEspecial, setTempEspecial] = React.useState("");
    const [tempEspecialOutro, setTempEspecialOutro] = React.useState("");
    const [tempMatematica, setTempMatematica] = React.useState(false);
    const [tempPortugues, setTempPortugues] = React.useState(false);
    const [tempSouMais, setTempSouMais] = React.useState(false);
    const [tempOutras, setTempOutras] = React.useState("");

    React.useEffect(() => {
        if (student) {
            setTempTutor(student.tutor ?? "");
            const ee = student.educacaoEspecial ?? "";
            const isStandard = ["", "Deficiência Intelectual", "Deficiência Física", "Autismo (TEA)"].includes(ee);
            if (isStandard) {
                setTempEspecial(ee);
                setTempEspecialOutro("");
            } else {
                setTempEspecial("Outro");
                setTempEspecialOutro(ee);
            }
            setTempMatematica(!!student.tutoriaMatematica);
            setTempPortugues(!!student.tutoriaPortugues);
            setTempSouMais(!!student.programaSouMais);
            setTempOutras(student.outrasInformacoes ?? "");
        }
    }, [student, menuOpen]);

    const saveFicha = async () => {
        if (!student || student.id === undefined) return;
        setSaving(true);
        try {
            const finalEspecial = tempEspecial === "Outro" ? tempEspecialOutro : tempEspecial;
            await updateStudent(student.id, {
                tutor: tempTutor || null,
                educacaoEspecial: finalEspecial || null,
                tutoriaMatematica: tempMatematica,
                tutoriaPortugues: tempPortugues,
                programaSouMais: tempSouMais,
                outrasInformacoes: tempOutras || null,
            });
            toast.success("Ficha do aluno atualizada com sucesso!");
            setMenuOpen(false);
        } catch (e) {
            toast.error("Erro ao salvar: " + (e as Error).message);
        } finally {
            setSaving(false);
        }
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
    const ppData = student.provaPaulista;
    const ppSubjects = ppData && ppData.grades ? Object.keys(ppData.grades) : [];

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
                    {hasLow && !editing && viewMode === "bimestre" && (
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
                        viewMode === "bimestre" && (
                            <Button onClick={() => setEditing(true)} size="sm">
                                <Edit2 /> <span className="hidden sm:inline">Editar</span>
                            </Button>
                        )
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
                             <div className="flex flex-col items-center gap-1 text-center">
                                 <button
                                     onClick={() => setViewMode(v => v === "bimestre" ? "provaPaulista" : "bimestre")}
                                     className="hover:text-primary transition-colors cursor-pointer focus:outline-none"
                                 >
                                     <h1 className="text-foreground text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
                                         {student.name}
                                     </h1>
                                 </button>
                             </div>
                            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs font-medium">
                                <button
                                    onClick={() => setViewMode("bimestre")}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md transition-all cursor-pointer",
                                        viewMode === "bimestre"
                                            ? "bg-card text-foreground shadow-sm font-semibold"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    Notas do Bimestre
                                </button>
                                <button
                                    onClick={() => setViewMode("provaPaulista")}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md transition-all cursor-pointer",
                                        viewMode === "provaPaulista"
                                            ? "bg-card text-foreground shadow-sm font-semibold"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    Prova Paulista
                                </button>
                            </div>
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
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setMenuOpen(true)}
                                    className="cursor-pointer gap-1.5"
                                >
                                    <ClipboardList className="size-3.5" />
                                    <span>Ficha do Aluno</span>
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-5">
                            {/* Heading */}
                            {viewMode === "provaPaulista" ? (
                                <div className="flex items-center gap-2">
                                    <p className="text-sm uppercase font-bold tracking-wider text-muted-foreground">
                                        Resultados Prova Paulista
                                    </p>
                                    <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
                                        {ppSubjects.length} disciplina{ppSubjects.length !== 1 ? "s" : ""}
                                    </span>
                                </div>
                            ) : (
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
                            )}

                            {/* Subject cards */}
                            {viewMode === "provaPaulista" ? (
                                !student.provaPaulista ? (
                                    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground space-y-3">
                                        <AlertTriangle className="size-8 mx-auto opacity-40 text-warning" />
                                        <h3 className="font-semibold text-foreground">Sem resultados da Prova Paulista</h3>
                                        <p className="text-xs max-w-sm mx-auto">
                                            Importe a planilha de resultados na página da turma para ver a participação, acertos e notas deste aluno.
                                        </p>
                                    </div>
                                ) : ppSubjects.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-6">Sem disciplinas da Prova Paulista para mostrar.</p>
                                ) : (
                                    <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                        {ppSubjects.map((subject, i) => {
                                            const grade = student.provaPaulista!.grades[subject];
                                            const friendlyName = PP_SUBJECT_NAMES[subject] || subject;
                                            const isLow = false;

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
                                                        "bg-card rounded-xl px-5 py-4 shadow-sm border border-border hover:shadow-md transition-shadow",
                                                        isLow && "border-l-4 border-l-destructive",
                                                    )}
                                                >
                                                    <div className="flex flex-col items-center justify-center gap-2 py-1 text-center w-full">
                                                        <span
                                                            className={cn(
                                                                "font-black text-base sm:text-lg uppercase tracking-wider truncate flex items-center gap-2 justify-center w-full min-w-0",
                                                                isLow ? "text-destructive" : "text-foreground"
                                                            )}
                                                            title={friendlyName}
                                                        >
                                                            <SubjectIcon name={subject} className="size-5.5 sm:size-6 shrink-0" />
                                                            <span className="truncate">{friendlyName}</span>
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                "text-2xl sm:text-3xl font-black tabular-nums leading-none mt-0.5 text-foreground",
                                                            )}
                                                        >
                                                            {formatPercentage(grade)}
                                                        </span>
                                                    </div>
                                                </motion.li>
                                            );
                                        })}
                                    </ul>
                                )
                            ) : (
                                displaySubjects.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Sem disciplinas para mostrar.</p>
                                ) : (
                                    <ul className={cn(
                                        "grid gap-4",
                                        editing
                                            ? "grid-cols-1 sm:grid-cols-2"
                                            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
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
                                                        "bg-card rounded-xl px-5 py-4 shadow-sm border border-border hover:shadow-md transition-shadow",
                                                        !editing && low && "border-l-4 border-l-destructive",
                                                    )}
                                                >
                                                    {editing ? (
                                                        <>
                                                            <div
                                                                className="text-base sm:text-lg font-medium mb-2 truncate flex items-center gap-2 min-w-0 tracking-tight"
                                                                title={formatSubject(subject)}
                                                            >
                                                                <SubjectIcon name={subject} className="size-4 sm:size-5" />
                                                                <span className="truncate">{formatSubject(subject)}</span>
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
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center gap-2 py-1 text-center w-full">
                                                            <span
                                                                className={cn(
                                                                    "font-black text-base sm:text-lg uppercase tracking-wider truncate flex items-center gap-2 justify-center w-full min-w-0",
                                                                    low ? "text-destructive" : "text-foreground"
                                                                )}
                                                                title={formatSubject(subject)}
                                                            >
                                                                <SubjectIcon name={subject} className="size-5.5 sm:size-6 shrink-0" />
                                                                <span className="truncate">{formatSubject(subject)}</span>
                                                            </span>
                                                            <span
                                                                className={cn(
                                                                    "text-2xl sm:text-3xl font-black tabular-nums leading-none mt-1",
                                                                    low
                                                                        ? "text-destructive"
                                                                        : "text-foreground",
                                                                )}
                                                            >
                                                                {formatValue(grade)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </motion.li>
                                            );
                                        })}
                                    </ul>
                                )
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="bg-card border-t border-border px-3 sm:px-6 py-2.5 shrink-0 flex flex-col gap-2">
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

            {/* Dialog da Ficha do Aluno */}
            <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ficha do Aluno</DialogTitle>
                        <DialogDescription>
                            Edite as informações de acompanhamento de {student.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* Tutor */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Tutor(a)</label>
                            <Input
                                type="text"
                                placeholder="Nome do Tutor(a)"
                                value={tempTutor}
                                onChange={(e) => setTempTutor(e.target.value)}
                            />
                        </div>

                        {/* Educação Especial */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Educação Especial</label>
                            <select
                                value={tempEspecial}
                                onChange={(e) => setTempEspecial(e.target.value)}
                                className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring text-foreground cursor-pointer"
                            >
                                <option value="">Não possui</option>
                                <option value="Deficiência Intelectual">Deficiência Intelectual</option>
                                <option value="Deficiência Física">Deficiência Física</option>
                                <option value="Autismo (TEA)">Autismo (TEA)</option>
                                <option value="Outro">Outro (especificar)</option>
                            </select>
                            {tempEspecial === "Outro" && (
                                <Input
                                    type="text"
                                    placeholder="Especifique a Educação Especial"
                                    value={tempEspecialOutro}
                                    onChange={(e) => setTempEspecialOutro(e.target.value)}
                                    className="mt-1.5 animate-fade-in"
                                />
                            )}
                        </div>

                        {/* Toggles / Checkboxes for Tutoria & Programa */}
                        <div className="space-y-2.5 pt-2">
                            <div className="flex items-center gap-2.5">
                                <input
                                    type="checkbox"
                                    id="tempMatematica"
                                    checked={tempMatematica}
                                    onChange={(e) => setTempMatematica(e.target.checked)}
                                    className="size-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                                />
                                <label htmlFor="tempMatematica" className="text-sm font-semibold text-foreground cursor-pointer select-none">
                                    Tutoria de Matemática
                                </label>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <input
                                    type="checkbox"
                                    id="tempPortugues"
                                    checked={tempPortugues}
                                    onChange={(e) => setTempPortugues(e.target.checked)}
                                    className="size-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                                />
                                <label htmlFor="tempPortugues" className="text-sm font-semibold text-foreground cursor-pointer select-none">
                                    Tutoria de Língua Portuguesa
                                </label>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <input
                                    type="checkbox"
                                    id="tempSouMais"
                                    checked={tempSouMais}
                                    onChange={(e) => setTempSouMais(e.target.checked)}
                                    className="size-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                                />
                                <label htmlFor="tempSouMais" className="text-sm font-semibold text-foreground cursor-pointer select-none">
                                    Programa SOU +
                                </label>
                            </div>
                        </div>

                        {/* Outras Informações */}
                        <div className="space-y-1.5 pt-1">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Outras Informações / Observações</label>
                            <textarea
                                placeholder="Anotações gerais do conselho..."
                                value={tempOutras}
                                onChange={(e) => setTempOutras(e.target.value)}
                                className="flex min-h-[80px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring text-foreground"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setMenuOpen(false)} disabled={saving} className="cursor-pointer">
                            Cancelar
                        </Button>
                        <Button variant="accent" onClick={saveFicha} disabled={saving} className="cursor-pointer">
                            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
                    "size-56 sm:size-80 lg:size-[460px] xl:size-[580px] rounded-3xl object-cover shadow-xl border-4 shrink-0",
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
            className="!size-56 !text-7xl sm:!size-80 sm:!text-8xl lg:!size-[460px] lg:!text-[180px] xl:!size-[580px] xl:!text-[230px] shadow-xl shrink-0"
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