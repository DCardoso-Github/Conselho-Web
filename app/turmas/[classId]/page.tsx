"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
    Download,
    FileText,
    Image as ImageIcon,
    Presentation,
    Trash2,
    Search,
    AlertTriangle,
    LayoutGrid,
    MoreVertical,
    Filter,
    Users,
    X,
    Upload,
} from "lucide-react";
import { useClass, useStudents } from "@/lib/hooks";
import { isLowGrade, deleteClass } from "@/lib/actions";
import { exportClassToXlsx } from "@/lib/mapao/exporter";
import { formatSubject } from "@/lib/mapao/subjects";
import { StudentGrid, type StudentSort } from "@/components/student-card";
import { ClassDashboard } from "@/components/class-dashboard";
import { PhotoImporter } from "@/components/photo-importer";
import { ProvaPaulistaImporter } from "@/components/prova-paulista-importer";
import { FrequenciaTutorImporter } from "@/components/frequencia-tutor-importer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function TurmaPage({
    params,
}: {
    params: Promise<{ classId: string }>;
}) {
    const { classId: rawId } = React.use(params);
    const classId = decodeURIComponent(rawId);
    const cls = useClass(classId);
    const students = useStudents(classId);
    const router = useRouter();

    const [search, setSearch] = React.useState("");
    const [debounced, setDebounced] = React.useState("");
    const debounceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const [onlyLow, setOnlyLow] = React.useState(false);
    const [redSubject, setRedSubject] = React.useState<string | null>(null);
    const [sort, setSort] = React.useState<StudentSort>("order");
    const [showDashboard, setShowDashboard] = React.useState(false);
    const [photoOpen, setPhotoOpen] = React.useState(false);
    const [provaPaulistaOpen, setProvaPaulistaOpen] = React.useState(false);
    const [freqTutorOpen, setFreqTutorOpen] = React.useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
    const [exportingPdf, setExportingPdf] = React.useState(false);

    React.useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => setDebounced(search), 200);
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [search]);

    const subjectsWithRed = React.useMemo(() => {
        if (!cls) return [];
        return cls.subjects
            .map((s) => ({
                subject: s,
                count: students.filter((st) => isLowGrade(st.grades[s])).length,
            }))
            .filter((x) => x.count > 0);
    }, [cls, students]);

    if (cls === undefined) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-12 text-center text-muted-foreground">
                Carregando…
            </div>
        );
    }
    if (cls === null) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-12 text-center">
                <p className="text-lg mb-4">Turma não encontrada.</p>
                <Button asChild>
                    <Link href="/">Voltar ao início</Link>
                </Button>
            </div>
        );
    }

    const handleExport = async () => {
        try {
            await exportClassToXlsx(classId);
            toast.success("Planilha exportada.");
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    const handleExportPdf = async () => {
        setExportingPdf(true);
        try {
            const { exportClassToPdf } = await import("@/lib/exportPdf");
            await exportClassToPdf(classId);
            toast.success("PDF exportado.");
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setExportingPdf(false);
        }
    };

    const handleDelete = async () => {
        await deleteClass(classId);
        toast.info(`Turma "${classId}" excluída.`);
        router.push("/");
    };

    const filtersActive = onlyLow || redSubject || debounced || sort !== "order";

    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-wrap items-center gap-3"
            >
                <div className="min-w-0">
                    <Badge variant="soft" className="mb-2">
                        Turma
                    </Badge>
                    <h1 className="h-display text-3xl sm:text-4xl text-foreground tracking-tight leading-none">
                        {cls.name}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                            <Users className="size-3.5" /> {students.length} aluno(s)
                        </span>
                        <span>·</span>
                        <span>{cls.subjects.length} disciplina(s)</span>
                    </p>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                    <Toggle
                        pressed={showDashboard}
                        onPressedChange={setShowDashboard}
                        aria-label="Painel"
                        size="sm"
                    >
                        <LayoutGrid className="size-4" />
                        <span className="hidden sm:inline">Painel</span>
                    </Toggle>
                    <Button
                        variant="accent"
                        onClick={() => setPhotoOpen(true)}
                    >
                        <ImageIcon /> <span className="hidden sm:inline">Fotos</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setProvaPaulistaOpen(true)}
                    >
                        <Upload className="size-4" /> <span className="hidden sm:inline">Prova Paulista</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setFreqTutorOpen(true)}
                    >
                        <Upload className="size-4" /> <span className="hidden sm:inline">Frequência/Tutor</span>
                    </Button>
                    <Button asChild>
                        <Link href={`/turmas/${encodeURIComponent(classId)}/apresentar`}>
                            <Presentation /> <span className="hidden sm:inline">Apresentar</span>
                        </Link>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Mais opções para turma ${classId}`}>
                                <MoreVertical className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleExport}>
                                <Download /> Exportar planilha
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportPdf} disabled={exportingPdf}>
                                <FileText /> {exportingPdf ? "Gerando PDF…" : "Exportar PDF de notas"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setConfirmDeleteOpen(true)}>
                                <Trash2 /> Excluir turma
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </motion.header>

            {showDashboard && (
                <motion.section
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.3 }}
                >
                    <ClassDashboard students={students} subjects={cls.subjects} />
                </motion.section>
            )}

            <Card>
                <CardContent className="p-3 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2">
                    <div className="relative w-full sm:flex-1 sm:min-w-[220px]">
                        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            className="pl-9 w-full"
                            placeholder="Buscar aluno…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Toggle
                        pressed={onlyLow}
                        onPressedChange={(v) => {
                            setOnlyLow(v);
                            if (v) setRedSubject(null);
                        }}
                        variant="danger"
                        size="sm"
                        aria-label="Só vermelhas"
                    >
                        <AlertTriangle className="size-4" />
                        <span className="hidden sm:inline">
                            {onlyLow ? "Vendo só vermelhas" : "Só vermelhas"}
                        </span>
                    </Toggle>
                    <Select
                        value={redSubject ?? "__all"}
                        onValueChange={(v) => {
                            const val = v === "__all" ? null : v;
                            setRedSubject(val);
                            if (val) setOnlyLow(false);
                        }}
                    >
                        <SelectTrigger className="w-auto min-w-[180px] h-9">
                            <SelectValue placeholder="Todas as disciplinas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all">Todas as disciplinas</SelectItem>
                            {subjectsWithRed.map(({ subject, count }) => (
                                <SelectItem key={subject} value={subject}>
                                    {formatSubject(subject)} ({count})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={sort}
                        onValueChange={(v) => setSort(v as StudentSort)}
                    >
                        <SelectTrigger className="w-auto h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="order">Ordem original</SelectItem>
                            <SelectItem value="name">Nome (A→Z)</SelectItem>
                            <SelectItem value="redCount">Mais vermelhas</SelectItem>
                        </SelectContent>
                    </Select>
                    {filtersActive && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setOnlyLow(false);
                                setRedSubject(null);
                                setSearch("");
                                setSort("order");
                            }}
                        >
                            <X className="size-3.5" /> Limpar
                        </Button>
                    )}
                </CardContent>
            </Card>

            <StudentGrid
                classId={classId}
                search={debounced}
                onlyLow={onlyLow}
                redSubject={redSubject}
                sort={sort}
                onClearFilters={() => {
                    setOnlyLow(false);
                    setRedSubject(null);
                    setSearch("");
                    setSort("order");
                }}
            />

            <PhotoImporter
                classId={classId}
                open={photoOpen}
                onOpenChange={setPhotoOpen}
            />
            <ProvaPaulistaImporter
                classId={classId}
                open={provaPaulistaOpen}
                onOpenChange={setProvaPaulistaOpen}
            />
            <FrequenciaTutorImporter
                classId={classId}
                open={freqTutorOpen}
                onOpenChange={setFreqTutorOpen}
            />
            <ConfirmDialog
                open={confirmDeleteOpen}
                onOpenChange={setConfirmDeleteOpen}
                title={`Excluir turma "${classId}"?`}
                description="Todos os alunos, notas, fotos e anotações serão removidos permanentemente."
                confirmLabel="Excluir"
                onConfirm={handleDelete}
            />
        </div>
    );
}
