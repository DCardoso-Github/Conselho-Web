import type { StudentRecord } from "./db";
import { numericGrade, type StudentEvolution } from "./evolution";

export const mean = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;

/** Numeric grades only: missing values and concepts are never imputed as zero. */
export function classOverview(students: StudentRecord[], subjects: string[]) {
  const keys = [...new Set(subjects)];
  const rows = keys.map((subject) => {
    const grades = students.flatMap((student) => {
      const grade = numericGrade(student.grades[subject]);
      return grade === null ? [] : [grade];
    });
    const low = grades.filter((grade) => grade <= 4).length;
    return {
      subject,
      count: grades.length,
      missing: students.length - grades.length,
      average: mean(grades),
      low,
      lowPercent: grades.length ? (low / grades.length) * 100 : null,
    };
  });
  const grades = students.flatMap((student) =>
    keys.flatMap((subject) => {
      const grade = numericGrade(student.grades[subject]);
      return grade === null ? [] : [grade];
    }),
  );
  const withLow = students.filter((student) =>
    keys.some((subject) => {
      const grade = numericGrade(student.grades[subject]);
      return grade !== null && grade <= 4;
    }),
  ).length;
  const withoutGrades = students.filter(
    (student) =>
      !keys.some((subject) => numericGrade(student.grades[subject]) !== null),
  ).length;
  return {
    rows,
    average: mean(grades),
    count: grades.length,
    expected: students.length * keys.length,
    withLow,
    withoutGrades,
    bands: [
      grades.filter((g) => g <= 4).length,
      grades.filter((g) => g > 4 && g < 7).length,
      grades.filter((g) => g >= 7).length,
    ],
  };
}

/** Each student has equal weight in the class mean; each subject uses matched pairs. */
export function classEvolution(rows: StudentEvolution[]) {
  const subjects = [
    ...new Set(rows.flatMap((row) => row.subjects.map((item) => item.subject))),
  ];
  const pairs = rows.flatMap((row) => row.subjects);
  return {
    before: mean(rows.map((row) => row.before)),
    after: mean(rows.map((row) => row.after)),
    gain: mean(rows.map((row) => row.gain)),
    improved: rows.filter((row) => row.gain > 1e-9).length,
    stable: rows.filter((row) => Math.abs(row.gain) <= 1e-9).length,
    declined: rows.filter((row) => row.gain < -1e-9).length,
    lowBefore: pairs.filter((item) => item.before <= 4).length,
    lowAfter: pairs.filter((item) => item.after <= 4).length,
    pairCount: pairs.length,
    subjects: subjects
      .map((subject) => {
        const values = pairs.filter((item) => item.subject === subject);
        return {
          subject,
          count: values.length,
          before: mean(values.map((item) => item.before))!,
          after: mean(values.map((item) => item.after))!,
          gain: mean(values.map((item) => item.gain))!,
        };
      })
      .sort(
        (a, b) =>
          b.gain - a.gain || a.subject.localeCompare(b.subject, "pt-BR"),
      ),
  };
}

export const searchKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
export const matchesSearch = (text: string, query: string) =>
  searchKey(query)
    .split(/\s+/)
    .every((word) => searchKey(text).includes(word));
