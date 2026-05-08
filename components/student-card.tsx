"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { AlertTriangle, ImageOff, SearchX } from "lucide-react";
import { type StudentRecord } from "@/lib/db";
import { useStudents } from "@/lib/hooks";
import { isLowGrade } from "@/lib/actions";
import { blobToObjectURL } from "@/lib/photos";
import { Avatar } from "./avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface StudentCardProps {
    classId: string;
    student: StudentRecord;
    index?: number;
}

function StudentCardInner({
    classId,
    student,
    index = 0,
}: StudentCardProps) {
    const id = student.id!;
    const lowCount = React.useMemo(
        () => Object.values(student.grades).filter((g) => isLowGrade(g)).length,
        [student.grades]
    );
    const hasLow = lowCount > 0;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                delay: Math.min(index * 0.015, 0.3),
                duration: 0.32,
                ease: [0.2, 0.8, 0.2, 1],
            }}
        >
            <Link
                href={`/turmas/${encodeURIComponent(classId)}/alunos/${id}`}
                className={cn("showcase group block", hasLow && "showcase-low")}
            >
                {student.photo ? (
                    <PhotoTile
                        studentId={id}
                        name={student.name}
                        photo={student.photo}
                    />
                ) : (
                    <NoPhotoTile name={student.name} />
                )}
                {hasLow && (
                    <Badge
                        variant="destructive"
                        className="absolute top-2 right-2 shadow-md backdrop-blur-sm gap-1"
                        title={`${lowCount} nota(s) vermelha(s)`}
                    >
                        <AlertTriangle className="size-3" /> {lowCount}
                    </Badge>
                )}
            </Link>
        </motion.div>
    );
}

export const StudentCard = React.memo(StudentCardInner);

function PhotoTile({
    studentId,
    name,
    photo,
}: {
    studentId: number;
    name: string;
    photo: Blob;
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
        <div className="showcase-img">
            {url ? (
                <motion.img
                    layoutId={`student-photo-${studentId}`}
                    src={url}
                    alt={name}
                    loading="lazy"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageOff className="size-8 opacity-40" />
                </div>
            )}
            <div className="showcase-overlay">
                <p className="showcase-name line-clamp-2">{name}</p>
            </div>
        </div>
    );
}

function NoPhotoTile({ name }: { name: string }) {
    return (
        <div className="showcase-no-photo">
            <Avatar name={name} size="lg" />
            <p className="name line-clamp-2">{name}</p>
        </div>
    );
}

export type StudentSort = "order" | "name" | "redCount";

export interface StudentGridProps {
    classId: string;
    search: string;
    onlyLow: boolean;
    redSubject: string | null;
    sort: StudentSort;
    onClearFilters?: () => void;
}

export function StudentGrid({
    classId,
    search,
    onlyLow,
    redSubject,
    sort,
    onClearFilters,
}: StudentGridProps) {
    const students = useStudents(classId);

    const filtered = React.useMemo(() => {
        if (students.length === 0) return students;
        const term = search.trim().toLowerCase();
        let list: StudentRecord[] = students;
        if (term) {
            list = list.filter((s) => s.name.toLowerCase().includes(term));
        }
        if (redSubject) {
            list = list.filter((s) => isLowGrade(s.grades[redSubject]));
        } else if (onlyLow) {
            list = list.filter((s) =>
                Object.values(s.grades).some((g) => isLowGrade(g))
            );
        }
        if (sort === "name") {
            list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        } else if (sort === "redCount") {
            list = [...list].sort((a, b) => {
                const ra = Object.values(a.grades).filter((g) => isLowGrade(g)).length;
                const rb = Object.values(b.grades).filter((g) => isLowGrade(g)).length;
                return rb - ra;
            });
        }
        return list;
    }, [students, search, onlyLow, redSubject, sort]);

    if (students.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
                Nenhum aluno nesta turma.
            </div>
        );
    }
    if (filtered.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 flex flex-col items-center gap-3 text-center text-muted-foreground">
                <SearchX className="size-8 opacity-40" />
                <p>Nenhum aluno corresponde aos filtros.</p>
                {onClearFilters && (
                    <button
                        onClick={onClearFilters}
                        className="text-sm text-primary underline-offset-2 hover:underline"
                    >
                        Limpar filtros
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {filtered.map((s, i) => (
                <StudentCard
                    key={s.id}
                    classId={classId}
                    student={s}
                    index={i}
                />
            ))}
        </div>
    );
}
