"use client";
import { Suspense, use, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Maximize, Settings2, Users, X } from "lucide-react";
import { db, type ClassRecord, type StudentRecord, type GradePeriodRecord } from "@/lib/db";
import { checkpointIndex, filterAnalysisStudents, readBand, selectedStudents, type PresentationCheckpoint } from "@/lib/analysis-navigation";
import { PresentationSession, useProjector } from "@/components/presentation-settings";
import { presentationStudents, remainingPresentationStudents, shortcutBlocked } from "@/lib/presentation";
import {
  comparePeriods,
  evolutionLeaders,
  periodId,
} from "@/lib/evolution";
import { recordEntry, recordPanel } from "@/lib/student-record-view";
import { StudentAnalysis } from "@/components/student-analysis";
import { StudentJump } from "@/components/student-jump";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  const filtered = filterAnalysisStudents(data.students, data.cls.subjects, query.get("subject"), readBand(query.get("band")), query.get("search") ?? "");
  const list = query.get("scope") === "selection" ? selectedStudents(filtered, query.get("ids")) : evolution
    ? evolutionLeaders(evolution).map((row) => row.student)
    : presentationStudents(
        data.students,
        query.get("scope") === "annual" ? "all" : query.get("scope"),
        query.get("scope") === "top" ? null : query.get("from"),
        data.cls.subjects,
      );
  const entry = recordEntry(query);
  const groupLabel = query.get("scope") === "top"
    ? "Alunos destaque"
    : query.get("scope") === "evolution" ? "Alunos evolução" : undefined;
  const cls = data.cls;
  return (
    <PresentationSession key={classId + query.toString()} sessionKey={`presentation:students:${classId}:${query.toString()}`}>
    {(initial, save) => <Presentation
      initial={initial} save={save} periods={data.periods}
      key={`${classId}:${query.toString()}`}
      annualScope={query.get("scope") === "annual"}
      entry={{
        ...entry,
        beforeId: entry.beforeId ?? before?.id,
        afterId: entry.afterId ?? after?.id,
      }}
      groupLabel={groupLabel}
      remaining={groupLabel ? remainingPresentationStudents(data.students, list, cls.subjects, evolution) : []}
      cls={cls}
      students={list}
      from={query.get("from")}
    />}
    </PresentationSession>
  );
}
function Presentation({
  cls,
  students: selected,
  from,
  entry,
  annualScope,
  periods,
  initial,
  save,
  remaining,
  groupLabel,
}: {
  remaining: StudentRecord[];
  groupLabel?: string;
  entry: PresentationCheckpoint;
  annualScope: boolean;
  periods: GradePeriodRecord[];
  initial?: PresentationCheckpoint;
  save: (state: PresentationCheckpoint) => void;
  cls: ClassRecord;
  students: StudentRecord[];
  from: string | null;
}) {
  const router = useRouter();
  const projector = useProjector();
  const [showRemaining, setShowRemaining] = useState(initial?.remaining ?? remaining.some(student => String(student.id) === from));
  const students = showRemaining ? [...selected, ...remaining] : selected;
  const [index, setIndex] = useState(() => checkpointIndex(students.map(s=>s.id), initial?.studentId ?? (from ? Number(from) : undefined)));
  const [onlyLow, setOnlyLow] = useState(initial?.onlyLow ?? entry.onlyLow ?? false);
  const [analysis, setAnalysis] = useState<PresentationCheckpoint>({
    ...entry, ...initial, panel: recordPanel(initial?.panel, recordPanel(entry.panel)),
  });
  const onAnalysisChange = useCallback((state: PresentationCheckpoint) => setAnalysis(previous => JSON.stringify(previous) === JSON.stringify(state) ? previous : state), []);
  const [exit, setExit] = useState(false);
  const [fullscreenMessage, setFullscreenMessage] = useState("");
  const safeIndex = Math.min(index, Math.max(0, students.length - 1));
  const currentId = students[safeIndex]?.id;
  useEffect(() => {
    if (currentId !== undefined) save({ ...analysis, studentId: currentId, remaining: showRemaining, onlyLow });
  }, [analysis,currentId,showRemaining,onlyLow,save]);
  const canContinue = !showRemaining && remaining.length > 0;
  const includeRemaining = useCallback(() => {
    setShowRemaining(true);
  }, []);
  const chooseStudent = useCallback((position: number) => {
    if (position === safeIndex) return;
    setIndex(position);
  }, [safeIndex]);
  const nextStudent = useCallback(() => {
    if (safeIndex >= students.length - 1 && canContinue) includeRemaining();
    else chooseStudent(Math.min(safeIndex + 1, Math.max(0, students.length - 1)));
  }, [safeIndex, students.length, canContinue, includeRemaining, chooseStudent]);
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
        chooseStudent(Math.max(0, safeIndex - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextStudent, chooseStudent, safeIndex]);
  const leave = () => {
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    const view = annualScope || groupLabel === "Alunos evolução" ? "evolution" : groupLabel === "Alunos destaque" ? "highlights" : "students";
    router.push(`/turmas/${encodeURIComponent(cls.id)}?view=${view}${annualScope ? "&year=" + analysis.annualYear : groupLabel === "Alunos evolução" ? "&mode=pair" : ""}`);
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
    <section className={`presentation-screen meeting-screen ${projector.enabled ? "projector-mode" : ""}`}>
      <header className="presentation-header">
        <div className="presentation-context">
          <span className="eyebrow">{groupLabel ?? "Conselho em apresentação"}</span>
          <strong>{cls.name}</strong>
        </div>
        <div className="presentation-actions">
          <Dialog>
            <DialogTrigger asChild><Button variant="outline"><Settings2 /><span>Controles</span></Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Controles da apresentação</DialogTitle><DialogDescription>Opções para conduzir a reunião.</DialogDescription></DialogHeader>
              {projector.control}
              <Button variant="outline" onClick={fullscreen}><Maximize />Tela cheia</Button>
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
            </DialogContent>
          </Dialog>
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
      <div className="meeting-details" key={student.id} role="region" aria-label="Ficha do aluno" tabIndex={0}>
        <StudentAnalysis periods={periods} currentPeriod={cls.currentPeriod} initial={analysis}
          onAnalysisChange={onAnalysisChange} onlyLow={onlyLow} onOnlyLowChange={setOnlyLow}
          student={student} subjects={cls.subjects} />
      </div>
      <footer className="presentation-footer">
        <span className="keyboard-hint">← → para trocar de aluno</span>
        <div className="student-navigation">
          <Button
            variant="outline"
            disabled={safeIndex === 0}
            onClick={() => chooseStudent(safeIndex - 1)}
          >
            <ChevronLeft /> Anterior
          </Button>
          <StudentJump students={students} current={safeIndex} onChoose={chooseStudent} />
          <span className="sr-only" aria-live="polite">{safeIndex + 1} de {students.length} · {student.name}</span>
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
