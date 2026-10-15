"use client";
import { useEffect, useRef, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { toast } from "sonner";
import type { StudentRecord } from "@/lib/db";
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
function draftOf(student: StudentRecord) {
  return {
    grades: { ...student.grades },
    absences: { ...student.absences },
    tutor: student.tutor ?? "",
    educacaoEspecial: student.educacaoEspecial ?? "",
    tutoriaMatematica: !!student.tutoriaMatematica,
    tutoriaPortugues: !!student.tutoriaPortugues,
    programaSouMais: !!student.programaSouMais,
    outrasInformacoes: student.outrasInformacoes ?? "",
  };
}
export function StudentEditor({
  student,
  subjects,
  onClose,
}: {
  student: StudentRecord;
  subjects: string[];
  onClose: () => void;
}) {
  const [initial] = useState(() => draftOf(student));
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
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
          <form onSubmit={save}>
            <Tabs.Root defaultValue="grades">
              <Tabs.List
                className="section-tabs"
                aria-label="Editar informações"
              >
                <Tabs.Trigger value="grades">Notas e faltas</Tabs.Trigger>
                <Tabs.Trigger value="support">Ficha do aluno</Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="grades" className="editor-fields">
                <div className="edit-grade-list">
                  {subjects.map((subject) => (
                    <fieldset key={subject}>
                      <legend>{formatSubject(subject)}</legend>
                      <label>
                        Nota
                        <Input
                          aria-label={`Nota de ${formatSubject(subject)}`}
                          type={
                            subject.startsWith("ESPORTE-MUSICA-ARTE")
                              ? "text"
                              : "number"
                          }
                          min="0"
                          max="10"
                          step="any"
                          value={draft.grades[subject] ?? ""}
                          placeholder="Sem informação"
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              grades: {
                                ...draft.grades,
                                [subject]:
                                  event.target.value === ""
                                    ? null
                                    : event.target.value,
                              },
                            })
                          }
                        />
                      </label>
                      <label>
                        Faltas
                        <Input
                          aria-label={`Faltas de ${formatSubject(subject)}`}
                          type="number"
                          min="0"
                          step="1"
                          value={draft.absences[subject] ?? ""}
                          placeholder="Sem informação"
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              absences: {
                                ...draft.absences,
                                [subject]:
                                  event.target.value === ""
                                    ? null
                                    : event.target.value,
                              },
                            })
                          }
                        />
                      </label>
                    </fieldset>
                  ))}
                </div>
              </Tabs.Content>
              <Tabs.Content value="support" className="editor-fields">
                <label className="form-field">
                  Tutor(a)
                  <Input
                    value={draft.tutor}
                    onChange={(event) =>
                      setDraft({ ...draft, tutor: event.target.value })
                    }
                  />
                </label>
                <label className="form-field">
                  Educação especial
                  <Input
                    value={draft.educacaoEspecial}
                    placeholder="Sem informação"
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        educacaoEspecial: event.target.value,
                      })
                    }
                  />
                </label>
                {(
                  [
                    {
                      key: "tutoriaMatematica",
                      label: "Tutoria de Matemática",
                    },
                    {
                      key: "tutoriaPortugues",
                      label: "Tutoria de Língua Portuguesa",
                    },
                    { key: "programaSouMais", label: "Programa SOU +" },
                  ] as const
                ).map(({ key, label }) => (
                  <label key={key} className="check-row">
                    <input
                      type="checkbox"
                      checked={draft[key]}
                      onChange={(event) =>
                        setDraft({ ...draft, [key]: event.target.checked })
                      }
                    />
                    {label}
                  </label>
                ))}
                <label className="form-field">
                  Observações do conselho
                  <textarea
                    rows={5}
                    value={draft.outrasInformacoes}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        outrasInformacoes: event.target.value,
                      })
                    }
                  />
                </label>
              </Tabs.Content>
            </Tabs.Root>
            <footer className="editor-footer">
              <Button
                type="button"
                variant="outline"
                onClick={close}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando…" : "Salvar alterações"}
              </Button>
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
