import type { GradePeriodRecord, StudentRecord } from "./db";
import { nameKey, numericGrade, periodLabel, periodOrder } from "./evolution";

export const gradeBands = { low: "Notas de 0 a 4", mid: "Notas acima de 4 e abaixo de 7", high: "Notas de 7 a 10" } as const;
export type GradeBand = keyof typeof gradeBands;
export function readBand(value: string | null): GradeBand | undefined {
  return value && Object.hasOwn(gradeBands, value) ? value as GradeBand : undefined;
}
export function inGradeBand(value: unknown, band: GradeBand) {
  const n = numericGrade(value);
  return n !== null && (band === "low" ? n <= 4 : band === "mid" ? n > 4 && n < 7 : n >= 7);
}
export function filterAnalysisStudents(students: StudentRecord[], subjects: string[], subject?: string | null, band?: GradeBand, search = "") {
  const names = nameKey(search);
  const keys = subject && subjects.includes(subject) ? [subject] : subjects;
  return students.filter(student => nameKey(student.name).includes(names) &&
    (!band || keys.some(key => inGradeBand(student.grades[key], band))));
}
export function analysisHref(classId: string, subject?: string, band: GradeBand = "low") {
  const query = new URLSearchParams({ band });
  if (subject) query.set("subject", subject);
  return `/turmas/${encodeURIComponent(classId)}?${query}`;
}
export function defaultComparison(periods: GradePeriodRecord[]) {
  const ordered = [...periods].sort((a,b) => periodOrder(a)-periodOrder(b));
  const after = ordered.at(-1);
  const before = ordered.filter(p => p.year === after?.year && p.term < after.term).at(-1);
  return { before, after };
}
export function studentTimeline(student: StudentRecord, periods: GradePeriodRecord[], year: number) {
  return [1,2,3,4].map(term => {
    const period = periods.find(p => p.year === year && p.term === term && p.classId === student.classId);
    const matches = period?.students.filter(s => nameKey(s.name) === nameKey(student.name)) ?? [];
    const values = matches.length === 1 ? period!.subjects.map(s => numericGrade(matches[0].grades[s])).filter((n): n is number => n !== null) : [];
    return { term, label: periodLabel({ year, term }), value: values.length ? values.reduce((a,b)=>a+b,0)/values.length : null };
  });
}
export type PresentationCheckpoint = {
  studentId?: number;
  panel?: string;
  remaining?: boolean;
  onlyLow?: boolean;
  beforeId?: string;
  afterId?: string;
};
export function checkpointIndex(ids: (string | number | undefined)[], saved?: string | number) {
  return Math.max(0, ids.findIndex(id => id === saved));
}
export function selectedStudents(students: StudentRecord[], ids: string | null) {
  if (ids === null) return students;
  const byId = new Map(students.map(s=>[s.id,s]));
  return [...new Set(ids.split(",").filter(s=>/^\d+$/.test(s)).map(Number))]
    .flatMap(id=>byId.has(id) ? [byId.get(id)!] : []);
}

