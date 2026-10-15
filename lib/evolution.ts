import type { GradePeriodRecord, SchoolPeriod, StudentRecord } from "./db";
import { normalizeName } from "./mapao/normalize";
import { compareProvaPaulista, type ProvaEvolution } from "./prova-evolution";

export const periodId = (classId: string, period: SchoolPeriod) =>
  JSON.stringify([classId, period.year, period.term]);
export const periodLabel = (period: SchoolPeriod) =>
  `${period.term}º bimestre · ${period.year}`;
export const periodOrder = (period: SchoolPeriod) =>
  period.year * 4 + period.term;
export const nameKey = (name: string) =>
  normalizeName(name).replace(/\s+/g, " ");

export function numericGrade(raw: unknown): number | null {
  if (typeof raw !== "number" && typeof raw !== "string") return null;
  const text = String(raw).trim().replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 && value <= 10 ? value : null;
}

export interface StudentEvolution {
  provaPaulista?: ProvaEvolution;
  student: StudentRecord;
  before: number;
  after: number;
  gain: number;
  subjects: { subject: string; before: number; after: number; gain: number }[];
}

function uniqueNames<T extends { name: string }>(rows: T[]) {
  const result = new Map<string, T>();
  const duplicates = new Set<string>();
  for (const row of rows) {
    const key = nameKey(row.name);
    if (result.has(key)) duplicates.add(key);
    result.set(key, row);
  }
  for (const key of duplicates) result.delete(key);
  return result;
}

/** Compara as mesmas disciplinas, na mesma turma/ano, sem imputar notas ausentes. */
export function comparePeriods(
  students: StudentRecord[],
  before?: GradePeriodRecord,
  after?: GradePeriodRecord,
): StudentEvolution[] {
  if (
    !before ||
    !after ||
    before.classId !== after.classId ||
    before.year !== after.year ||
    before.term >= after.term
  )
    return [];
  const previous = uniqueNames(before.students);
  const next = uniqueNames(after.students);
  const current = uniqueNames(students);
  const shared = [...new Set(before.subjects)].filter((subject) =>
    after.subjects.includes(subject),
  );
  return [...current.values()].flatMap((student) => {
    if (student.classId !== before.classId) return [];
    const old = previous.get(nameKey(student.name));
    const recent = next.get(nameKey(student.name));
    if (!old || !recent) return [];
    const subjects = shared.flatMap((subject) => {
      const a = numericGrade(old.grades[subject]);
      const b = numericGrade(recent.grades[subject]);
      return a === null || b === null
        ? []
        : [{ subject, before: a, after: b, gain: b - a }];
    });
    if (!subjects.length) return [];
    const a =
      subjects.reduce((sum, row) => sum + row.before, 0) / subjects.length;
    const b =
      subjects.reduce((sum, row) => sum + row.after, 0) / subjects.length;
    const gain =
      subjects.reduce((sum, row) => sum + row.gain, 0) / subjects.length;
    return [{ student, before: a, after: b, gain, subjects, provaPaulista: compareProvaPaulista(student, before, after) }];
  });
}

export function evolutionRanking(rows: StudentEvolution[]) {
  return [...rows]
    .sort(
      (a, b) =>
        b.gain - a.gain ||
        b.subjects.length - a.subjects.length ||
        nameKey(a.student.name).localeCompare(
          nameKey(b.student.name),
          "pt-BR",
        ) ||
        a.student.order - b.student.order,
    );
}

export function evolutionLeaders(rows: StudentEvolution[]) {
  return evolutionRanking(rows.filter((row) => row.gain > 1e-9)).slice(0, 6);
}

export const formatGrade = (value: number) =>
  value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export const formatGain = (value: number) =>
  `${value > 1e-9 ? "+" : ""}${formatGrade(Math.abs(value) < 1e-9 ? 0 : value)}`;
