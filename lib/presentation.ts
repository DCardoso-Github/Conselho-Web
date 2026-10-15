import type { StudentRecord } from "./db";
import { isLowGrade } from "./actions";

export const PAGE_SIZE = 6;
export const SUBJECT_PAGE_SIZE = 4;
export const hasValue = (value: unknown) =>
  value !== null &&
  value !== undefined &&
  !["", "-", "S/N"].includes(String(value).trim().toUpperCase());
export const displayValue = (value: unknown) =>
  hasValue(value) ? String(value) : "Sem informação";
export const hasLowGrades = (student: StudentRecord) =>
  Object.values(student.grades).some(
    (grade) => hasValue(grade) && isLowGrade(grade),
  );

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
) {
  const low = students.filter(hasLowGrades);
  const selected =
    scope === "all"
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
