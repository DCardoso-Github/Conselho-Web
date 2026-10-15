"use client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowUpRight, SearchX, Star, CheckSquare, Trash2 } from "lucide-react";
import type { StudentHighlight } from "@/lib/highlights";
import { studentAverage } from "@/lib/highlights";
import { formatGrade } from "@/lib/evolution";
import type { StudentRecord } from "@/lib/db";
import { useStudents } from "@/lib/hooks";
import { deleteStudents, isLowGrade } from "@/lib/actions";
import { hasValue, hasLowGrades } from "@/lib/presentation";
import { StudentProfile } from "./student-profile";
import { StudentTutor } from "./student-tutor";
import { Button } from "./ui/button";
import { ConfirmDialog } from "./confirm-dialog";
import { StudentActions } from "./student-actions";
export interface StudentCardProps {
  classId: string;
  student: StudentRecord;
  index?: number;
  highlight?: StudentHighlight;
  subjects?: string[];
  selection?: { checked: boolean; onChange: () => void };
  onSelect?: () => void;
}
export function StudentCard({ classId, student, highlight, subjects, selection, onSelect }: StudentCardProps) {
  const average = highlight?.average ?? studentAverage(student, subjects);
  const low = Object.values(student.grades).filter(
    (grade) => hasValue(grade) && isLowGrade(grade),
  ).length;
  const content = (
    <>
      {selection && <span className="student-selection-check"><input type="checkbox" aria-label={`Selecionar ${student.name}`} checked={selection.checked} onChange={selection.onChange} /><span>{selection.checked ? "Selecionado" : "Selecionar"}</span></span>}
      <StudentProfile compact student={student} />
      <div className="student-tile-content">
        {highlight && (
          <span className="highlight-label">
            <Star aria-hidden="true" /> Aluno destaque
          </span>
        )}
        <h2>{student.name}</h2>
        <StudentTutor tutor={student.tutor} />
          <div className="highlight-average">
            <span>Média das notas</span>
            <strong>
              {average === null ? "Sem informação" : formatGrade(average)}
            </strong>
          </div>
        <p className={low ? "attention" : "supporting-text"}>
          <AlertTriangle /> {low} nota{low === 1 ? "" : "s"} vermelha
          {low === 1 ? "" : "s"}
        </p>
        <span className="tile-action">
          {selection ? (selection.checked ? "Selecionado para exclusão" : "Selecionar aluno") : <>Abrir aluno <ArrowUpRight /></>}
        </span>
      </div>
    </>
  );
  const className = `student-tile ${highlight ? "student-highlight" : ""} ${selection?.checked ? "student-tile-selected" : ""}`;
  return <StudentActions student={student} selected={selection?.checked} onSelect={selection?.onChange ?? onSelect}>
    {selection ? <label className={className}>{content}</label> : <Link className={className} href={`/turmas/${encodeURIComponent(classId)}/alunos/${student.id}`}>{content}</Link>}
  </StudentActions>;
}
export type StudentSort = "order" | "name" | "redCount";
export interface StudentGridProps {
  classId: string;
  search: string;
  onlyLow: boolean;
  redSubject: string | null;
  sort: StudentSort;
  onClearFilters?: () => void;
  selectionRequest?: { id: number; serial: number } | null;
  onClearSelection?: () => void;
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
        props.selectionRequest?.serial,
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
  selectionRequest,
  onClearSelection,
}: StudentGridProps & { students: StudentRecord[] }) {
  const [selecting, setSelecting] = useState(!!selectionRequest);
  const [selected, setSelected] = useState<Set<number>>(() => new Set(selectionRequest ? [selectionRequest.id] : []));
  const [pending, setPending] = useState<StudentRecord[]>([]);
  const chosen = students.filter(student => student.id !== undefined && selected.has(student.id));
  const selectable = students.filter(student => student.id !== undefined);
  const clearSelection = () => { setSelected(new Set()); setSelecting(false); onClearSelection?.(); };
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
      <div className="bulk-student-toolbar">
        {selecting ? <>
          <span role="status">{chosen.length} de {students.length} alunos selecionados</span>
          <Button variant="outline" onClick={() => setSelected(chosen.length === selectable.length ? new Set() : new Set(selectable.map(student => student.id!)))}>
            <CheckSquare /> {chosen.length === selectable.length ? "Desmarcar todos" : "Selecionar todos os resultados"}
          </Button>
          <Button variant="destructive" disabled={!chosen.length} onClick={() => setPending([...chosen])}><Trash2 /> Excluir selecionados ({chosen.length})</Button>
          <Button variant="ghost" onClick={clearSelection}>Cancelar seleção</Button>
          <p className="supporting-text">Alterar a busca, os filtros ou a ordenação limpa a seleção.</p>
        </> : <Button variant="outline" onClick={() => setSelecting(true)}><CheckSquare /> Selecionar alunos</Button>}
      </div>
      <p className="results-count" aria-live="polite">
        {students.length} alunos · todos nesta página
      </p>
      <div className="selection-grid student-selection-grid">
        {students.map((student) => (
          <StudentCard key={student.id} classId={classId} student={student} onSelect={() => {
            if (student.id === undefined) return;
            setSelecting(true);
            setSelected(previous => new Set([...previous, student.id!]));
          }} selection={selecting && student.id !== undefined ? {
            checked: selected.has(student.id),
            onChange: () => setSelected(previous => { const next = new Set(previous); if (next.has(student.id!)) next.delete(student.id!); else next.add(student.id!); return next; }),
          } : undefined} />
        ))}
      </div>
      <ConfirmDialog
        open={pending.length > 0}
        onOpenChange={open => { if (!open) setPending([]); }}
        title={`Excluir ${pending.length} aluno${pending.length === 1 ? "" : "s"}?`}
        description={<>
          <p>Os alunos abaixo serão removidos da turma {classId}, incluindo suas notas atuais, fotos, frequência, Prova Paulista e anotações. Os registros dos bimestres anteriores serão mantidos. Esta ação não pode ser desfeita.</p>
          <ul className="bulk-delete-names" aria-label="Alunos selecionados para exclusão" tabIndex={0}>{pending.map(student => <li key={student.id}>{student.name}</li>)}</ul>
        </>}
        confirmLabel={`Excluir ${pending.length} aluno${pending.length === 1 ? "" : "s"}`}
        onConfirm={async () => {
          await deleteStudents(classId, pending.map(student => student.id!));
          toast.success(`${pending.length} aluno${pending.length === 1 ? " excluído" : "s excluídos"}.`);
          clearSelection();
        }}
      />
    </>
  );
}
