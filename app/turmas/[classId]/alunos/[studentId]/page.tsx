"use client";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { shortcutBlocked } from "@/lib/presentation";
import { StudentProfile } from "@/components/student-profile";
import { StudentPanels } from "@/components/student-panels";
import { StudentEditor } from "@/components/student-editor";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
export default function AlunoPage({
  params,
}: {
  params: Promise<{ classId: string; studentId: string }>;
}) {
  const { classId: raw, studentId } = use(params);
  const classId = decodeURIComponent(raw);
  const router = useRouter();
  const [onlyLow, setOnlyLow] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const closeEditor = useCallback(() => setEditing(false), []);
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
  const index =
    data?.students.findIndex((student) => String(student.id) === studentId) ??
    -1;
  const student = data?.students[index];
  const go = useCallback(
    (next: number) => {
      const target = data?.students[next];
      if (target && !editing)
        router.push(
          `/turmas/${encodeURIComponent(classId)}/alunos/${target.id}`,
        );
    },
    [classId, data, editing, router],
  );
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
        router.push(`/turmas/${encodeURIComponent(classId)}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, go, index, router, classId]);
  if (!data) return <p className="empty-panel">Carregando aluno…</p>;
  if (!data.cls || !student)
    return (
      <div className="empty-panel">
        <h1>Aluno não encontrado</h1>
        <Button
          onClick={() => router.push(`/turmas/${encodeURIComponent(classId)}`)}
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
          onClick={() => router.push(`/turmas/${encodeURIComponent(classId)}`)}
        >
          <ArrowLeft /> Turma {data.cls.name}
        </Button>
        <div className="presentation-actions">
          <Button variant="outline" className="text-destructive" disabled={uploading} onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Excluir aluno
          </Button>
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Edit2 /> Editar aluno
          </Button>
          <Button
            onClick={() =>
              router.push(
                `/turmas/${encodeURIComponent(classId)}/apresentar?scope=all&from=${student.id}`,
              )
            }
          >
            <Play /> Apresentar
          </Button>
        </div>
      </header>
      <StudentPanels
        onlyLow={onlyLow}
        onOnlyLowChange={setOnlyLow}
        key={student.id}
        student={student}
        subjects={data.cls.subjects}
        profile={
          <div className="profile-column">
            <StudentProfile key={student.id} student={student} />
            <Button variant="outline" asChild disabled={uploading}>
              <label className="photo-upload">
                <ImagePlus />{" "}
                {uploading
                  ? "Processando foto…"
                  : student.photo
                    ? "Trocar foto"
                    : "Adicionar foto"}
                <input
                  aria-label="Foto do aluno"
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void addPhoto(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </Button>
          </div>
        }
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
            <strong>{index + 1}</strong> / {data.students.length}
          </span>
          <Button
            size="lg"
            disabled={index >= data.students.length - 1}
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
          router.replace(`/turmas/${encodeURIComponent(classId)}`);
        }}
      />
    </section>
  );
}
