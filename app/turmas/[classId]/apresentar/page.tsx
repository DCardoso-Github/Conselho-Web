"use client";
import { Suspense, use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Maximize, X } from "lucide-react";
import { db, type ClassRecord, type StudentRecord } from "@/lib/db";
import { presentationStudents, shortcutBlocked } from "@/lib/presentation";
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
  const list = presentationStudents(
    data.students,
    query.get("scope"),
    query.get("from"),
  );
  return (
    <Presentation
      key={`${classId}:${query.toString()}`}
      cls={data.cls}
      students={list}
      from={query.get("from")}
    />
  );
}
function Presentation({
  cls,
  students,
  from,
}: {
  cls: ClassRecord;
  students: StudentRecord[];
  from: string | null;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      students.findIndex((student) => String(student.id) === from),
    ),
  );
  const [exit, setExit] = useState(false);
  const [fullscreenMessage, setFullscreenMessage] = useState("");
  const safeIndex = Math.min(index, Math.max(0, students.length - 1));
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (shortcutBlocked(event.target)) return;
      if (event.key === "Escape") setExit(true);
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        setIndex((i) => Math.min(i + 1, students.length - 1));
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [students.length]);
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
        <Button onClick={leave}>Voltar à turma</Button>
      </div>
    );
  const student = students[safeIndex];
  return (
    <section className="presentation-screen">
      <header className="presentation-header">
        <div className="presentation-context">
          <span className="eyebrow">Conselho em apresentação</span>
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
      <div className="student-stage">
        <StudentProfile key={`photo-${student.id}`} student={student} />
        <StudentPanels
          key={student.id}
          student={student}
          subjects={cls.subjects}
        />
      </div>
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
            disabled={safeIndex >= students.length - 1}
            onClick={() => setIndex(safeIndex + 1)}
          >
            Próximo <ChevronRight />
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
