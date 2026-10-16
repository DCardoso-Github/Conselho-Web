"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { CheckSquare, ExternalLink, Pencil, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { StudentRecord } from "@/lib/db";
import { deleteStudent } from "@/lib/actions";
import { StudentEditor } from "./student-editor";
import { ConfirmDialog } from "./confirm-dialog";

type Actions = {
  edit: (student: StudentRecord, returnFocus: HTMLElement | null) => void;
  select: (student: StudentRecord) => void;
  remove: (student: StudentRecord, returnFocus: HTMLElement | null) => void;
};
const ActionsContext = createContext<Actions | null>(null);

export function StudentActionsProvider({ children, subjects, onSelect }: {
  children: ReactNode;
  subjects: string[];
  onSelect: (student: StudentRecord) => void;
}) {
  const [editing, setEditing] = useState<StudentRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StudentRecord | null>(null);
  const focusTarget = useRef<HTMLElement | null>(null);
  const restoreDialogFocus = useCallback(() => {
    requestAnimationFrame(() => {
      if (focusTarget.current?.isConnected) focusTarget.current.focus();
      else document.querySelector<HTMLElement>('[role="tab"][data-state="active"]')?.focus();
    });
  }, []);
  const closeEditor = useCallback(() => {
    setEditing(null);
    restoreDialogFocus();
  }, [restoreDialogFocus]);
  return <ActionsContext.Provider value={{
    edit: (student, target) => { focusTarget.current = target; setEditing(student); },
    select: onSelect,
    remove: (student, target) => { focusTarget.current = target; setPendingDelete(student); },
  }}>
    {children}
    {editing && <StudentEditor key={editing.id} student={editing} subjects={subjects} onClose={closeEditor} />}
    <ConfirmDialog
      open={!!pendingDelete}
      onOpenChange={open => { if (!open) { setPendingDelete(null); restoreDialogFocus(); } }}
      title={pendingDelete ? `Excluir ${pendingDelete.name}?` : "Excluir aluno?"}
      description={pendingDelete ? `O aluno será removido da turma ${pendingDelete.classId}, incluindo suas notas atuais, foto, frequência, Prova Paulista e anotações. Os registros dos bimestres anteriores serão mantidos. Esta ação não pode ser desfeita.` : undefined}
      confirmLabel="Excluir aluno"
      onConfirm={async () => {
        if (pendingDelete?.id === undefined) throw new Error("Aluno não encontrado nesta turma.");
        await deleteStudent(pendingDelete.classId, pendingDelete.id);
        toast.success(`${pendingDelete.name} excluído da turma.`);
      }}
    />
  </ActionsContext.Provider>;
}

/** Student commands live in the card's context menu. */
export function StudentActions({ student, children, onSelect, selected = false, viewQuery = "scope=all" }: {
  viewQuery?: string;
  student: StudentRecord;
  children: ReactNode;
  onSelect?: () => void;
  selected?: boolean;
}) {
  const actions = useContext(ActionsContext);
  const router = useRouter();
  const trigger = useRef<HTMLDivElement>(null);
  const pendingDialog = useRef<(() => void) | null>(null);
  if (!actions) return children;
  const base = `/turmas/${encodeURIComponent(student.classId)}`;
  const cardFocusTarget = () => trigger.current?.querySelector<HTMLElement>("a, button") ?? trigger.current;
  const commands = [
    { id: "select", label: selected ? "Desmarcar aluno" : "Selecionar aluno", icon: CheckSquare },
    { id: "edit", label: "Editar aluno", icon: Pencil },
    { id: "open", label: "Abrir ficha do aluno", icon: ExternalLink },
    { id: "present", label: "Apresentar aluno", icon: Play },
    { id: "delete", label: "Excluir aluno", icon: Trash2 },
  ] as const;
  const runCommand = (id: typeof commands[number]["id"]) => {
    if (id === "select") { if (onSelect) onSelect(); else actions.select(student); }
    if (id === "edit") pendingDialog.current = () => actions.edit(student, cardFocusTarget());
    if (id === "delete") pendingDialog.current = () => actions.remove(student, cardFocusTarget());
    if (id === "open") router.push(`${base}/alunos/${student.id}?${viewQuery}`);
    if (id === "present") router.push(`${base}/apresentar?${viewQuery}&from=${student.id}`);
  };
  const restoreFocus = (event: Event) => {
    event.preventDefault();
    const openDialog = pendingDialog.current;
    pendingDialog.current = null;
    // Open only after the menu releases its modal pointer lock and focus scope.
    if (openDialog) requestAnimationFrame(openDialog);
    else cardFocusTarget()?.focus();
  };
  return <ContextMenu.Root>
    <ContextMenu.Trigger asChild>
      <div ref={trigger} tabIndex={-1} className="student-card-shell" data-student-id={student.id} onKeyDown={event => {
        if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          event.currentTarget.dispatchEvent(new MouseEvent("contextmenu", {
            bubbles: true, cancelable: true, button: 2,
            clientX: rect.left + rect.width / 2, clientY: rect.top + 24,
          }));
        }
      }}>
        {children}
      </div>
    </ContextMenu.Trigger>
    <ContextMenu.Portal>
      <ContextMenu.Content className="student-action-menu" collisionPadding={12} onCloseAutoFocus={restoreFocus}>
        <ContextMenu.Label className="student-action-name">{student.name}</ContextMenu.Label>
        {commands.map(({ id, label, icon: Icon }) => <ContextMenu.Item key={id} className="student-action-item" data-destructive={id === "delete" || undefined} disabled={id === "delete" && student.id === undefined} onSelect={() => runCommand(id)}><Icon aria-hidden="true" />{label}</ContextMenu.Item>)}
      </ContextMenu.Content>
    </ContextMenu.Portal>
  </ContextMenu.Root>;
}
