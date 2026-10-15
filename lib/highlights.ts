import type { StudentRecord } from "./db";

export interface StudentHighlight {
  student: StudentRecord;
  average: number;
  gradeCount: number;
  subjectCount: number;
  lowCount: number;
}

/** Calcula os destaques da turma inteira, sem alterar os registros. */
export function studentHighlights(
  students: StudentRecord[],
  subjects?: string[],
): StudentHighlight[] {
  return students
    .flatMap((student) => {
      const keys = subjects ?? Object.keys(student.grades);
      const grades = keys.flatMap((subject) => {
        const raw = student.grades[subject];
        if (raw === null || raw === undefined || String(raw).trim() === "")
          return [];
        const text = String(raw).trim().replace(",", ".");
        if (!/^\d+(?:\.\d+)?$/.test(text)) return [];
        const value = Number(text);
        return Number.isFinite(value) && value >= 0 && value <= 10
          ? [value]
          : [];
      });
      if (!grades.length) return [];
      return [
        {
          student,
          average:
            grades.reduce((sum, grade) => sum + grade, 0) / grades.length,
          gradeCount: grades.length,
          subjectCount: keys.length,
          lowCount: grades.filter((grade) => grade <= 4).length,
        },
      ];
    })
    .sort(
      (a, b) =>
        b.average - a.average ||
        a.lowCount - b.lowCount ||
        a.student.name.localeCompare(b.student.name, "pt-BR") ||
        a.student.order - b.student.order ||
        (a.student.id ?? 0) - (b.student.id ?? 0),
    )
    .slice(0, 6);
}
