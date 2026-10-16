"use client";
import { Suspense, use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Edit2,
  ImagePlus,
  Play,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/db";
import { deleteStudent, setStudentPhoto } from "@/lib/actions";
import { processPhoto } from "@/lib/photos";
import { remainingPresentationStudents, shortcutBlocked } from "@/lib/presentation";
import { comparePeriods, periodId } from "@/lib/evolution";
import { defaultComparison, type PresentationCheckpoint } from "@/lib/analysis-navigation";
import { StudentProfile } from "@/components/student-profile";
import { StudentAnalysis } from "@/components/student-analysis";
import { StudentEditor } from "@/components/student-editor";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
export default function AlunoPage({
  params,
}: {
  params: Promise<{ classId: string; studentId: string }>;
}) {
  const { classId: raw, studentId } = use(params);
  return <Suspense fallback={<p className="empty-panel">Carregando aluno…</p>}>
    <AlunoRoute classId={decodeURIComponent(raw)} studentId={studentId} />
  </Suspense>;
}
function AlunoRoute({ classId, studentId }: { classId: string; studentId: string }) {
  const query = useSearchParams();
  return <AlunoContent key={`${classId}:${studentId}:${query}`} classId={classId} studentId={studentId} query={new URLSearchParams(query.toString())} />;
}
function AlunoContent({ classId, studentId, query }: { classId: string; studentId: string; query: URLSearchParams }) {
  const router = useRouter();
  const scope = query.get("scope") === "evolution" ? "evolution" : query.get("scope") === "top" ? "top" : "all";
  const returnHref = `/turmas/${encodeURIComponent(classId)}?view=${scope === "evolution" ? "evolution" : scope === "top" ? "highlights" : "students"}`;
  const [analysis, setAnalysis] = useState<PresentationCheckpoint>({});
  const onAnalysisChange = useCallback((state: PresentationCheckpoint) => setAnalysis(previous => JSON.stringify(previous) === JSON.stringify(state) ? previous : state), []);
  const [onlyLow, setOnlyLow] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const closeEditor = useCallback(() => setEditing(false), []);
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
  const defaults = defaultComparison(data?.periods ?? []);
  const before = data?.periods.find(p => p.id === (analysis.beforeId ?? periodId(classId, { year: Number(query.get("year")), term: Number(query.get("baseline")) }))) ?? defaults.before;
  const after = data?.periods.find(p => p.id === (analysis.afterId ?? periodId(classId, { year: Number(query.get("year")), term: Number(query.get("target")) }))) ?? defaults.after;
  const viewQuery = new URLSearchParams({ scope });
  if (scope === "evolution" && before && after) {
    viewQuery.set("year", String(before.year));
    viewQuery.set("baseline", String(before.term));
    viewQuery.set("target", String(after.term));
  }
  const students = useMemo(() => !data ? [] : scope === "all" ? data.students : remainingPresentationStudents(data.students, [], data.cls?.subjects, scope === "evolution" ? comparePeriods(data.students, before, after) : undefined), [data, scope, before, after]);
  const index = students.findIndex(student => String(student.id) === studentId);
  const student = students[index];
  const navigationQuery = viewQuery.toString();
  const go = useCallback((next: number) => {
      const target = students[next];
      if (target && !editing)
        router.push(
          `/turmas/${encodeURIComponent(classId)}/alunos/${target.id}?${navigationQuery}`,
        );
    }, [students, editing, router, classId, navigationQuery]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (editing || shortcutBlocked(event.target)) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        go(index + 1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(index - 1);
      }
      if (event.key === "Escape")
        router.push(returnHref);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, go, index, router, returnHref]);
  if (!data) return <p className="empty-panel">Carregando aluno…</p>;
  if (!data.cls || !student)
    return (
      <div className="empty-panel">
        <h1>Aluno não encontrado</h1>
        <Button
          onClick={() => router.push(returnHref)}
        >
          Voltar à turma
        </Button>
      </div>
    );
  const addPhoto = async (file: File) => {
    if (student.id === undefined) return;
    setUploading(true);
    try {
      await setStudentPhoto(student.id, await processPhoto(file));
      toast.success("Foto atualizada.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
    }
  };
  return (
    <section className="presentation-screen detail-screen">
      <header className="presentation-header">
        <Button
          variant="ghost"
          onClick={() => router.push(returnHref)}
        >
          <ArrowLeft /> Turma {data.cls.name}
        </Button>
        <div className="presentation-actions">
          <Button variant="outline" asChild disabled={uploading}>
            <label className="photo-upload">
              <ImagePlus />{uploading ? "Processando foto…" : student.photo ? "Trocar foto" : "Adicionar foto"}
              <input aria-label="Foto do aluno" type="file" accept="image/*" disabled={uploading} onChange={event => {
                const file = event.target.files?.[0];
                if (file) void addPhoto(file);
                event.target.value = "";
              }} />
            </label>
          </Button>
          <Button variant="outline" className="text-destructive" disabled={uploading} onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Excluir aluno
          </Button>
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Edit2 /> Editar aluno
          </Button>
          <Button
            onClick={() =>
              router.push(
                `/turmas/${encodeURIComponent(classId)}/apresentar?${viewQuery}&from=${student.id}`,
              )
            }
          >
            <Play /> Apresentar
          </Button>
        </div>
      </header>
      <StudentAnalysis
        allowEvolution={scope === "evolution"}
        startInEvolution={scope === "evolution"}
        initial={{ beforeId: before?.id, afterId: after?.id }}
        onAnalysisChange={onAnalysisChange}
        periods={data.periods}
        onlyLow={onlyLow}
        onOnlyLowChange={setOnlyLow}
        key={student.id}
        student={student}
        subjects={data.cls.subjects}
        profile={<StudentProfile key={student.id} student={student} />}
      />
      <footer className="presentation-footer">
        <span className="keyboard-hint">← → para trocar de aluno</span>
        <div className="student-navigation">
          <Button
            variant="outline"
            disabled={index <= 0}
            onClick={() => go(index - 1)}
          >
            <ChevronLeft /> Anterior
          </Button>
          <span aria-live="polite">
            <strong>{index + 1}</strong> / {students.length}
          </span>
          <Button
            size="lg"
            disabled={index >= students.length - 1}
            onClick={() => go(index + 1)}
          >
            Próximo <ChevronRight />
          </Button>
        </div>
      </footer>
      {editing && (
        <StudentEditor
          student={student}
          subjects={data.cls.subjects}
          onClose={closeEditor}
        />
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Excluir ${student.name}?`}
        description={`O aluno será removido da turma ${data.cls.name}, incluindo suas notas atuais, foto, frequência, Prova Paulista e anotações. Os registros dos bimestres anteriores serão mantidos no histórico. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir aluno"
        onConfirm={async () => {
          if (student.id === undefined) return;
          await deleteStudent(classId, student.id);
          toast.success("Aluno excluído.");
          router.replace(returnHref);
        }}
      />
    </section>
  );
}
