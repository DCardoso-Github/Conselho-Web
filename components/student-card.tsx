"use client";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, SearchX } from "lucide-react";
import type { StudentRecord } from "@/lib/db";
import { useStudents } from "@/lib/hooks";
import { isLowGrade } from "@/lib/actions";
import { hasValue, hasLowGrades } from "@/lib/presentation";
import { StudentProfile } from "./student-profile";
import { Button } from "./ui/button";
export interface StudentCardProps {
  classId: string;
  student: StudentRecord;
  index?: number;
}
export function StudentCard({ classId, student }: StudentCardProps) {
  const low = Object.values(student.grades).filter(
    (grade) => hasValue(grade) && isLowGrade(grade),
  ).length;
  return (
    <Link
      className="student-tile"
      href={`/turmas/${encodeURIComponent(classId)}/alunos/${student.id}`}
    >
      <StudentProfile compact student={student} />
      <div className="student-tile-content">
        <h2>{student.name}</h2>
        <p className={low ? "attention" : "supporting-text"}>
          <AlertTriangle /> {low} nota{low === 1 ? "" : "s"} vermelha
          {low === 1 ? "" : "s"}
        </p>
        <span className="tile-action">
          Abrir aluno <ArrowUpRight />
        </span>
      </div>
    </Link>
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
export function StudentGrid(props: StudentGridProps) {
  const students = useStudents(props.classId);
  let filtered = students.filter((student) =>
    student.name
      .toLocaleLowerCase("pt-BR")
      .includes(props.search.trim().toLocaleLowerCase("pt-BR")),
  );
  if (props.redSubject)
    filtered = filtered.filter(
      (student) =>
        hasValue(student.grades[props.redSubject!]) &&
        isLowGrade(student.grades[props.redSubject!]),
    );
  else if (props.onlyLow) filtered = filtered.filter(hasLowGrades);
  if (props.sort === "name")
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  if (props.sort === "redCount") {
    const count = (student: StudentRecord) =>
      Object.values(student.grades).filter(
        (grade) => hasValue(grade) && isLowGrade(grade),
      ).length;
    filtered = [...filtered].sort((a, b) => count(b) - count(a));
  }
  return (
    <StudentResults
      key={JSON.stringify([
        props.classId,
        props.search,
        props.onlyLow,
        props.redSubject,
        props.sort,
      ])}
      students={filtered}
      {...props}
    />
  );
}
function StudentResults({
  students,
  classId,
  onClearFilters,
}: StudentGridProps & { students: StudentRecord[] }) {
  if (!students.length)
    return (
      <div className="empty-panel">
        <SearchX />
        <h2>Nenhum aluno encontrado</h2>
        <p>Confira os filtros ou importe o mapão da turma.</p>
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Limpar filtros
          </Button>
        )}
      </div>
    );
  return (
    <>
      <p className="results-count" aria-live="polite">
        {students.length} alunos · todos nesta página
      </p>
      <div className="selection-grid student-selection-grid">
        {students.map((student) => (
          <StudentCard key={student.id} classId={classId} student={student} />
        ))}
      </div>
    </>
  );
}
