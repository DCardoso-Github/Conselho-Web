"use client";
import { Suspense, use, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Maximize, Users, X } from "lucide-react";
import { db, type ClassRecord, type StudentRecord, type SchoolPeriod } from "@/lib/db";
import { compareProvaPaulista } from "@/lib/prova-evolution";
import { presentationStudents, remainingPresentationStudents, shortcutBlocked } from "@/lib/presentation";
import {
  comparePeriods,
  evolutionLeaders,
  periodId,
  periodLabel,
  type StudentEvolution,
} from "@/lib/evolution";
import { StudentProfile } from "@/components/student-profile";
import { StudentPanels } from "@/components/student-panels";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
export default function ApresentarPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = use(params);
  return (
    <Suspense
      fallback={<p className="empty-panel">Carregando apresentação…</p>}
    >
      <PresentationLoader classId={decodeURIComponent(classId)} />
    </Suspense>
  );
}
function PresentationLoader({ classId }: { classId: string }) {
  const query = useSearchParams();
  const data = useLiveQuery(
    async () => ({
      cls: await db.classes.get(classId),
      periods: await db.gradePeriods.where("classId").equals(classId).toArray(),
      students: await db.students
        .where("classId")
        .equals(classId)
        .sortBy("order"),
    }),
    [classId],
  );
  if (!data) return <p className="empty-panel">Carregando apresentação…</p>;
  if (!data.cls)
    return (
      <div className="empty-panel">
        <h1>Turma não encontrada</h1>
        <Button asChild>
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    );
  const before = data.periods.find(
    (period) =>
      period.id ===
      periodId(classId, {
        year: Number(query.get("year")),
        term: Number(query.get("baseline")),
      }),
  );
  const after = data.periods.find(
    (period) =>
      period.id ===
      periodId(classId, {
        year: Number(query.get("year")),
        term: Number(query.get("target")),
      }),
  );
  const evolution =
    query.get("scope") === "evolution"
      ? comparePeriods(data.students, before, after)
      : undefined;
  const list = evolution
    ? evolutionLeaders(evolution).map((row) => row.student)
    : presentationStudents(
        data.students,
        query.get("scope"),
        query.get("from"),
        data.cls.subjects,
      );
  const groupLabel = query.get("scope") === "top"
    ? "Alunos destaque"
    : query.get("scope") === "evolution" ? "Alunos evolução" : undefined;
  return (
    <Presentation
      key={`${classId}:${query.toString()}`}
      evolution={evolution}
      comparisonPeriods={evolution && before && after ? [before, after] : undefined}
      groupLabel={groupLabel}
      remaining={groupLabel ? remainingPresentationStudents(data.students, list, data.cls.subjects, evolution) : []}
      comparisonLabels={
        evolution && before && after ? [periodLabel(before), periodLabel(after)] : undefined
      }
      cls={data.cls}
      students={list}
      from={query.get("from")}
    />
  );
}
function Presentation({
  cls,
  students: selected,
  from,
  evolution,
  comparisonLabels,
  comparisonPeriods,
  remaining,
  groupLabel,
}: {
  remaining: StudentRecord[];
  groupLabel?: string;
  evolution?: StudentEvolution[];
  comparisonLabels?: [string, string];
  comparisonPeriods?: [SchoolPeriod, SchoolPeriod];
  cls: ClassRecord;
  students: StudentRecord[];
  from: string | null;
}) {
  const router = useRouter();
  const [showRemaining, setShowRemaining] = useState(false);
  const students = showRemaining ? [...selected, ...remaining] : selected;
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      students.findIndex((student) => String(student.id) === from),
    ),
  );
  const [onlyLow, setOnlyLow] = useState(false);
  const [exit, setExit] = useState(false);
  const [fullscreenMessage, setFullscreenMessage] = useState("");
  const safeIndex = Math.min(index, Math.max(0, students.length - 1));
  const canContinue = !showRemaining && remaining.length > 0;
  const includeRemaining = useCallback(() => {
    setShowRemaining(true);
  }, []);
  const nextStudent = useCallback(() => {
    if (safeIndex >= students.length - 1 && canContinue) includeRemaining();
    else setIndex(Math.min(safeIndex + 1, Math.max(0, students.length - 1)));
  }, [safeIndex, students.length, canContinue, includeRemaining]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (shortcutBlocked(event.target)) return;
      if (event.key === "Escape") setExit(true);
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        nextStudent();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextStudent]);
  const leave = () => {
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    router.push(`/turmas/${encodeURIComponent(cls.id)}`);
  };
  const fullscreen = async () => {
    try {
      if (!document.documentElement.requestFullscreen)
        throw new Error("unsupported");
      await document.documentElement.requestFullscreen();
      setFullscreenMessage("");
    } catch {
      setFullscreenMessage(
        "Tela cheia indisponível. Você pode continuar nesta janela.",
      );
    }
  };
  if (!students.length)
    return (
      <div className="empty-panel">
        <h1>Nenhum aluno nesta seleção</h1>
        {canContinue && <Button onClick={includeRemaining}>Apresentar restante da turma ({remaining.length})</Button>}
        <Button onClick={leave}>Voltar à turma</Button>
      </div>
    );
  const student = students[safeIndex];
  return (
    <section className="presentation-screen">
      <header className="presentation-header">
        {remaining.length > 0 && (
          <Button
            variant="outline"
            className="presentation-group-toggle"
            onClick={includeRemaining}
            disabled={showRemaining}
            aria-label={showRemaining ? undefined : `Apresentar restante da turma (${remaining.length})`}
          >
            <Users aria-hidden="true" />
            {showRemaining ? `Turma completa (${students.length})` : `Restante da turma (${remaining.length})`}
          </Button>
        )}
        <div className="presentation-context">
          <span className="eyebrow">{groupLabel ?? "Conselho em apresentação"}</span>
          <strong>{cls.name}</strong>
        </div>
        <div className="presentation-actions">
          <Button variant="outline" onClick={fullscreen}>
            <Maximize />
            <span>Tela cheia</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => setExit(true)}
            aria-label="Sair da apresentação"
          >
            <X />
            <span>Sair</span>
          </Button>
        </div>
      </header>
      {fullscreenMessage && (
        <p role="status" className="supporting-text">
          {fullscreenMessage}
        </p>
      )}
      <StudentPanels
        provaEvolution={comparisonPeriods ? compareProvaPaulista(student, ...comparisonPeriods) : undefined}
        evolution={evolution?.find((row) => row.student.id === student.id)}
        comparisonLabels={comparisonLabels}
        onlyLow={onlyLow}
        onOnlyLowChange={setOnlyLow}
        key={student.id}
        student={student}
        subjects={cls.subjects}
        profile={<StudentProfile student={student} />}
      />
      <footer className="presentation-footer">
        <span className="keyboard-hint">← → para trocar de aluno</span>
        <div className="student-navigation">
          <Button
            variant="outline"
            disabled={safeIndex === 0}
            onClick={() => setIndex(safeIndex - 1)}
          >
            <ChevronLeft /> Anterior
          </Button>
          <span aria-live="polite" aria-atomic="true">
            <strong>{safeIndex + 1}</strong> / {students.length}
            <span className="sr-only"> alunos · {student.name}</span>
          </span>
          <Button
            size="lg"
            disabled={safeIndex >= students.length - 1 && !canContinue}
            onClick={nextStudent}
          >
            {safeIndex >= students.length - 1 && canContinue ? "Restante da turma" : "Próximo"} <ChevronRight />
          </Button>
        </div>
      </footer>
      <ConfirmDialog
        open={exit}
        onOpenChange={setExit}
        title="Encerrar apresentação?"
        description="Você voltará para a turma. Os dados continuam salvos."
        confirmLabel="Voltar à turma"
        onConfirm={leave}
      />
    </section>
  );
}
