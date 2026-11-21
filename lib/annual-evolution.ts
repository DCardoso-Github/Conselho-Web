import type { GradePeriodRecord, ProvaPaulistaRecord, StudentRecord } from "./db";
import { classOverview, mean } from "./class-analytics";
import { nameKey, periodId } from "./evolution";
import { numericPercentage, PP_NAMES } from "./prova-evolution";

export const terms = [1, 2, 3, 4] as const;

export const annualPresentationHref = (classId: string, year: number) =>
  `/turmas/${encodeURIComponent(classId)}/apresentar-paineis?view=annual&year=${year}`;

export function schoolYears(periods: GradePeriodRecord[]) {
  return [...new Set(periods.map(period => period.year))].sort((a, b) => b - a);
}

export function annualPeriods(periods: GradePeriodRecord[], classId: string, year: number) {
  return terms.map(term => periods.find(p => p.classId === classId && p.year === year && p.term === term));
}

export function matchedStudent(period: GradePeriodRecord, name: string) {
  const key = nameKey(name);
  const matches = period.students.filter(row => nameKey(row.name) === key);
  return matches.length === 1 ? matches[0] : undefined;
}

export function annualGrades(periods: GradePeriodRecord[], classId: string, year: number, student?: StudentRecord) {
  const snapshots = annualPeriods(periods, classId, year);
  const points = snapshots.map((period, index) => {
    const match = period && student && student.classId === classId ? matchedStudent(period, student.name) : undefined;
    const rows = student ? (match ? [match] : []) : (period?.students ?? []);
    const grades = classOverview(rows, period?.subjects ?? []);
    return { term: terms[index], imported: !!period, count: grades.count, average: grades.average,
      studentsWithGrades: rows.length - grades.withoutGrades, subjects: grades.rows };
  });
  const keys = [...new Set(snapshots.flatMap(period => period?.subjects ?? []))];
  const subjects = keys.map(subject => ({
    subject, values: points.map(point => point.subjects.find(row => row.subject === subject)?.average ?? null),
  }));
  return { points, subjects };
}

export function annualProva(students: StudentRecord[], classId: string, year: number) {
  const roster = students.filter(student => student.classId === classId);
  const records = terms.map(term => {
    const id = periodId(classId, { year, term });
    return roster.flatMap(student => {
      const result = student.provaPaulistaHistory?.[id] ??
        (student.provaPaulistaPeriod?.year === year && student.provaPaulistaPeriod.term === term ? student.provaPaulista : undefined);
      return result ? [result] : [];
    });
  });
  function metric(getValue: (record: ProvaPaulistaRecord) => unknown) {
    return records.map(rows => mean(rows.map(row => numericPercentage(getValue(row))).filter((n): n is number => n !== null)));
  }
  const subjects = [...new Set(records.flat().flatMap(row => Object.keys(row.grades)))];
  return [
    { label: "Acertos", values: metric(row => row.acertos) },
    { label: "Participação", values: metric(row => row.participacao) },
    ...subjects.map(key => ({ label: PP_NAMES[key] ?? key, values: metric(row => row.grades[key]) })),
  ];
}
