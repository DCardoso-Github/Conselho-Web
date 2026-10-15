import { studentHighlights } from "./highlights";
import type { StudentRecord } from "./db";
import { isLowGrade } from "./actions";

export const PAGE_SIZE = 6;
export const hasValue = (value: unknown) =>
  value !== null &&
  value !== undefined &&
  !["", "-", "S/N"].includes(String(value).trim().toUpperCase());
export const displayValue = (value: unknown) =>
  hasValue(value) ? String(value) : "Sem informação";
export const lowGradeCount = (
  student: StudentRecord,
  subjects = Object.keys(student.grades),
) =>
  subjects.filter(
    (subject) =>
      hasValue(student.grades[subject]) && isLowGrade(student.grades[subject]),
  ).length;
export const hasLowGrades = (student: StudentRecord) =>
  lowGradeCount(student) > 0;

export function remainingPresentationStudents(
  students: StudentRecord[],
  selected: StudentRecord[],
) {
  const selectedIds = new Set(selected.map((student) => student.id));
  return students
    .filter((student) => !selectedIds.has(student.id))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function percentage(value: unknown) {
  if (!hasValue(value)) return "Sem informação";
  const raw = String(value).trim();
  const number = Number(raw.replace("%", "").replace(",", "."));
  if (!Number.isFinite(number)) return "Sem informação";
  const normalized =
    !raw.includes("%") && number > 0 && number <= 1 ? number * 100 : number;
  return `${normalized.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function presentationStudents(
  students: StudentRecord[],
  scope: string | null,
  from: string | null,
  subjects?: string[],
) {
  const low = students.filter(hasLowGrades);
  const selected =
    scope === "top"
      ? studentHighlights(students, subjects).map(({ student }) => student)
      : scope === "all"
        ? students
        : scope === "low"
          ? low
          : low.length
            ? low
            : students;
  const requested = from
    ? students.find((student) => String(student.id) === from)
    : undefined;
  return requested && !selected.some((student) => student.id === requested.id)
    ? students
    : selected;
}

export function shortcutBlocked(target: EventTarget | null) {
  return (
    !!document.querySelector(
      '[role="dialog"], [role="alertdialog"], [role="menu"]',
    ) ||
    (target instanceof HTMLElement &&
      !!target.closest(
        'input, textarea, select, button, a, [role="tab"], [contenteditable="true"]',
      ))
  );
}
