import type { StudentRecord } from "./db";
import { numericGrade } from "./evolution";
import { formatSubject } from "./mapao/subjects";

export function studentDraft(student: StudentRecord) {
  return {
    grades: { ...student.grades },
    absences: { ...student.absences },
    tutor: student.tutor ?? "",
    educacaoEspecial: student.educacaoEspecial ?? "",
    tutoriaMatematica: !!student.tutoriaMatematica,
    tutoriaPortugues: !!student.tutoriaPortugues,
    programaSouMais: !!student.programaSouMais,
    outrasInformacoes: student.outrasInformacoes ?? "",
    notes: student.notes ?? "",
  };
}

/** Validate changed academic fields even when their tab is not mounted. */
export function validateStudentDraft(draft: ReturnType<typeof studentDraft>, original: StudentRecord): string | null {
  for (const [subject, value] of Object.entries(draft.grades)) {
    if (value === original.grades[subject] || value === null || String(value).trim() === "") continue;
    if (numericGrade(value) === null && !/^(ET|ES|EP)$/i.test(String(value).trim()))
      return `Confira a nota de ${formatSubject(subject)}: use de 0 a 10 ou um conceito ET, ES ou EP.`;
  }
  for (const [subject, value] of Object.entries(draft.absences)) {
    if (value === original.absences[subject] || value === null || String(value).trim() === "") continue;
    const number = Number(String(value).trim());
    if (!Number.isInteger(number) || number < 0)
      return `Confira as faltas de ${formatSubject(subject)}: use um número inteiro a partir de zero.`;
  }
  return null;
}
