"use client";
import { useEffect, useId, useRef, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { toast } from "sonner";
import { db, type StudentRecord } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, Calculator, Check, ClipboardList, HeartHandshake, MessageSquare, Save, Sparkles, UserRound } from "lucide-react";
import { studentDraft, validateStudentDraft } from "@/lib/student-edit";
import { SubjectIcon } from "./subject-icon";
import { updateStudent } from "@/lib/actions";
import { formatSubject } from "@/lib/mapao/subjects";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ConfirmDialog } from "./confirm-dialog";
export function StudentEditor({
  student,
  subjects,
  onClose,
}: {
  student: StudentRecord;
  subjects: string[];
  onClose: () => void;
}) {
  const [initial] = useState(() => studentDraft(student));
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("support");
  const [error, setError] = useState<string | null>(null);
  const tutorListId = useId();
  const errorId = useId();
  const tutors = useLiveQuery(async () => {
    const students = await db.students.where("classId").equals(student.classId).toArray();
    return [...new Set(students.map(item => item.tutor?.trim()).filter((name): name is string => !!name))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [student.classId]) ?? [];
  const [discard, setDiscard] = useState(false);
  const dirty = JSON.stringify(initial) !== JSON.stringify(draft);
  const guard = useRef({ dirty: false, saving: false });
  const historyGuard = useRef({ marker: "", active: false });
  useEffect(() => {
    guard.current = { dirty, saving };
  }, [dirty, saving]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (guard.current.dirty || guard.current.saving) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    // A same-URL entry lets Back close the editor without leaving unsaved work.
    const state = historyGuard.current;
    state.marker ||= crypto.randomUUID();
    state.active = true;
    const marker = state.marker;
    if (history.state?.conselhoEditor !== marker) {
      history.pushState(
        { ...history.state, conselhoEditor: marker },
        "",
        location.href,
      );
    }
    const back = (event: PopStateEvent) => {
      event.stopImmediatePropagation();
      history.pushState(
        { ...history.state, conselhoEditor: marker },
        "",
        location.href,
      );
      if (guard.current.saving) return;
      if (guard.current.dirty) setDiscard(true);
      else onClose();
    };
    window.addEventListener("popstate", back, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("popstate", back, true);
      state.active = false;
      // React Strict Mode immediately reconnects effects. Only remove the
      // sentinel after a real unmount, not its development-only rehearsal.
      queueMicrotask(() => {
        if (!state.active && history.state?.conselhoEditor === marker)
          history.back();
      });
    };
  }, [onClose]);
  const close = () => {
    if (saving) return;
    if (dirty) setDiscard(true);
    else onClose();
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (student.id === undefined) return;
    const validation = validateStudentDraft(draft, student);
    if (validation) {
      setError(validation);
      setTab("grades");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateStudent(student.id, draft);
      toast.success("Informações do aluno salvas.");
      onClose();
    } catch (error) {
      toast.error("Não foi possível salvar: " + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <Dialog open onOpenChange={(open) => !open && close()}>
        <DialogContent
          className="editor-dialog"
          onEscapeKeyDown={(event) => {
            if (discard) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Editar aluno</DialogTitle>
            <DialogDescription>{student.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} noValidate className="student-editor-form">
            <Tabs.Root value={tab} onValueChange={setTab} className="student-editor-tabs">
              <Tabs.List className="editor-tabs" aria-label="Editar informações">
                <Tabs.Trigger value="support"><UserRound aria-hidden="true" />Ficha do aluno</Tabs.Trigger>
                <Tabs.Trigger value="programs"><Sparkles aria-hidden="true" />Programas</Tabs.Trigger>
                <Tabs.Trigger value="grades"><BookOpen aria-hidden="true" />Notas e faltas</Tabs.Trigger>
                <Tabs.Trigger value="notes"><MessageSquare aria-hidden="true" />Observações</Tabs.Trigger>
              </Tabs.List>
              {error && <p id={errorId} className="editor-error" role="alert">{error}</p>}
              <Tabs.Content value="support" className="editor-fields">
                <section className="editor-section">
                  <h2><UserRound aria-hidden="true" />Tutor(a)</h2>
                  <p>Escolha um nome já utilizado na turma ou escreva um novo.</p>
                  <label className="form-field">Nome do tutor ou da tutora
                    <Input list={tutorListId} autoComplete="off" placeholder="Digite o nome" value={draft.tutor} disabled={saving} onChange={event => setDraft({ ...draft, tutor: event.target.value })} />
                  </label>
                  <datalist id={tutorListId}>{tutors.map(name => <option key={name} value={name} />)}</datalist>
                </section>
                <section className="editor-section">
                  <h2><HeartHandshake aria-hidden="true" />Educação especial</h2>
                  <p>Registre os atendimentos, apoios e adaptações relevantes para o conselho.</p>
                  <label className="form-field">Informações de educação especial
                    <textarea rows={4} placeholder="Ex.: atendimento educacional especializado e apoios necessários" value={draft.educacaoEspecial} disabled={saving} onChange={event => setDraft({ ...draft, educacaoEspecial: event.target.value })} />
                  </label>
                </section>
              </Tabs.Content>
              <Tabs.Content value="programs" className="editor-fields">
                <section className="editor-section">
                  <h2><Sparkles aria-hidden="true" />Programas de acompanhamento</h2>
                  <p>Marque os programas dos quais o aluno participa.</p>
                  <div className="editor-programs">
                    {([
                      { key: "tutoriaMatematica", label: "Tutoria de Matemática", icon: Calculator, detail: "Acompanhamento das aprendizagens de matemática." },
                      { key: "tutoriaPortugues", label: "Tutoria de Língua Portuguesa", icon: BookOpen, detail: "Acompanhamento de leitura e escrita." },
                      { key: "programaSouMais", label: "Programa SOU +", icon: Sparkles, detail: "Participação no programa da escola." },
                    ] as const).map(({ key, label, icon: Icon, detail }) => (
                      <label key={key} className={`editor-program ${draft[key] ? "selected" : ""}`}>
                        <Icon aria-hidden="true" />
                        <span><strong>{label}</strong><small>{detail}</small></span>
                        <input type="checkbox" checked={draft[key]} disabled={saving} onChange={event => setDraft({ ...draft, [key]: event.target.checked })} />
                      </label>
                    ))}
                  </div>
                </section>
              </Tabs.Content>
              <Tabs.Content value="grades" className="editor-fields">
                <p className="supporting-text">Notas de 0 a 10 ou conceitos ET, ES e EP. Deixe em branco quando não houver informação.</p>
                <div className="edit-grade-list">
                  {subjects.map(subject => (
                    <fieldset key={subject} disabled={saving}>
                      <legend><SubjectIcon name={subject} />{formatSubject(subject)}</legend>
                      <label>Nota
                        <Input aria-label={`Nota de ${formatSubject(subject)}`} aria-describedby={error ? errorId : undefined} type="text" value={draft.grades[subject] ?? ""} placeholder="Sem informação" onChange={event => setDraft({ ...draft, grades: { ...draft.grades, [subject]: event.target.value === "" ? null : event.target.value } })} />
                      </label>
                      <label>Faltas
                        <Input aria-label={`Faltas de ${formatSubject(subject)}`} type="text" inputMode="numeric" value={draft.absences[subject] ?? ""} placeholder="Sem informação" onChange={event => setDraft({ ...draft, absences: { ...draft.absences, [subject]: event.target.value === "" ? null : event.target.value } })} />
                      </label>
                    </fieldset>
                  ))}
                </div>
              </Tabs.Content>
              <Tabs.Content value="notes" className="editor-fields">
                <section className="editor-section">
                  <h2><MessageSquare aria-hidden="true" />Observações do conselho</h2>
                  <p>Registre os pontos discutidos e os encaminhamentos para o aluno.</p>
                  <label className="form-field">Observações do conselho
                    <textarea rows={5} placeholder="Pontos de atenção e próximos passos" value={draft.outrasInformacoes} disabled={saving} onChange={event => setDraft({ ...draft, outrasInformacoes: event.target.value })} />
                  </label>
                </section>
                <section className="editor-section">
                  <h2><ClipboardList aria-hidden="true" />Anotações adicionais</h2>
                  <label className="form-field">Anotações adicionais
                    <textarea rows={3} placeholder="Outros registros de acompanhamento" value={draft.notes} disabled={saving} onChange={event => setDraft({ ...draft, notes: event.target.value })} />
                  </label>
                </section>
              </Tabs.Content>
            </Tabs.Root>
            <footer className="editor-footer">
              <p role="status" className={dirty ? "editor-unsaved" : ""}>{dirty ? "Alterações não salvas" : <><Check aria-hidden="true" />Informações atualizadas</>}</p>
              <Button type="button" variant="outline" onClick={close} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving || !dirty}><Save aria-hidden="true" />{saving ? "Salvando…" : "Salvar alterações"}</Button>
            </footer>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={discard}
        onOpenChange={setDiscard}
        title="Descartar alterações?"
        description="Há informações que ainda não foram salvas."
        confirmLabel="Descartar"
        onConfirm={onClose}
      />
    </>
  );
}
