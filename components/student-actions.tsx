"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import * as ContextMenu from "@radix-ui/react-context-menu";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CheckSquare, ExternalLink, MoreHorizontal, Pencil, Play } from "lucide-react";
import type { StudentRecord } from "@/lib/db";
import { StudentEditor } from "./student-editor";

type Actions = {
  edit: (student: StudentRecord, returnFocus: HTMLElement | null) => void;
  select: (student: StudentRecord) => void;
};
const ActionsContext = createContext<Actions | null>(null);

export function StudentActionsProvider({ children, subjects, onSelect }: {
  children: ReactNode;
  subjects: string[];
  onSelect: (student: StudentRecord) => void;
}) {
  const [editing, setEditing] = useState<StudentRecord | null>(null);
  const focusTarget = useRef<HTMLElement | null>(null);
  const closeEditor = useCallback(() => {
    setEditing(null);
    requestAnimationFrame(() => {
      if (focusTarget.current?.isConnected) focusTarget.current.focus();
    });
  }, []);
  return <ActionsContext.Provider value={{
    edit: (student, target) => { focusTarget.current = target; setEditing(student); },
    select: onSelect,
  }}>
    {children}
    {editing && <StudentEditor key={editing.id} student={editing} subjects={subjects} onClose={closeEditor} />}
  </ActionsContext.Provider>;
}

/** The same commands are available with right click, keyboard and the touch button. */
export function StudentActions({ student, children, onSelect, selected = false }: {
  student: StudentRecord;
  children: ReactNode;
  onSelect?: () => void;
  selected?: boolean;
}) {
  const actions = useContext(ActionsContext);
  const router = useRouter();
  const trigger = useRef<HTMLButtonElement>(null);
  const editing = useRef(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  if (!actions) return children;
  const base = `/turmas/${encodeURIComponent(student.classId)}`;
  const commands = [
    { id: "select", label: selected ? "Desmarcar aluno" : "Selecionar aluno", icon: CheckSquare },
    { id: "edit", label: "Editar aluno", icon: Pencil },
    { id: "open", label: "Abrir ficha do aluno", icon: ExternalLink },
    { id: "present", label: "Apresentar aluno", icon: Play },
  ] as const;
  const runCommand = (id: typeof commands[number]["id"]) => {
    if (id === "select") { if (onSelect) onSelect(); else actions.select(student); }
    if (id === "edit") { editing.current = true; actions.edit(student, trigger.current); }
    if (id === "open") router.push(`${base}/alunos/${student.id}`);
    if (id === "present") router.push(`${base}/apresentar?scope=all&from=${student.id}`);
  };
  const restoreFocus = (event: Event) => {
    event.preventDefault();
    if (!editing.current) trigger.current?.focus();
  };
  return <ContextMenu.Root onOpenChange={open => { if (open) editing.current = false; }}>
    <ContextMenu.Trigger asChild>
      <div className="student-card-shell" data-student-id={student.id} onKeyDown={event => {
        if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
          event.preventDefault();
          editing.current = false;
          setDropdownOpen(true);
        }
      }}>
        {children}
        <DropdownMenu.Root open={dropdownOpen} onOpenChange={open => { if (open) editing.current = false; setDropdownOpen(open); }}>
          <DropdownMenu.Trigger asChild>
            <button ref={trigger} type="button" className="student-actions-trigger" aria-label={`Ações de ${student.name}`} title="Ações do aluno">
              <MoreHorizontal aria-hidden="true" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="student-action-menu" sideOffset={6} align="end" collisionPadding={12} onCloseAutoFocus={restoreFocus}>
              <DropdownMenu.Label className="student-action-name">{student.name}</DropdownMenu.Label>
              {commands.map(({ id, label, icon: Icon }) => <DropdownMenu.Item key={id} className="student-action-item" onSelect={() => runCommand(id)}><Icon aria-hidden="true" />{label}</DropdownMenu.Item>)}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </ContextMenu.Trigger>
    <ContextMenu.Portal>
      <ContextMenu.Content className="student-action-menu" collisionPadding={12} onCloseAutoFocus={restoreFocus}>
        <ContextMenu.Label className="student-action-name">{student.name}</ContextMenu.Label>
        {commands.map(({ id, label, icon: Icon }) => <ContextMenu.Item key={id} className="student-action-item" onSelect={() => runCommand(id)}><Icon aria-hidden="true" />{label}</ContextMenu.Item>)}
      </ContextMenu.Content>
    </ContextMenu.Portal>
  </ContextMenu.Root>;
}
