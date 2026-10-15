import type { ProvaPaulistaRecord, SchoolPeriod, StudentRecord } from "./db";

export const PP_NAMES: Record<string, string> = {
  MAT: "Matemática", PORT: "Língua Portuguesa", ING: "Língua Inglesa", HIST: "História",
  GEO: "Geografia", CIE: "Ciências", FIN: "Educação Financeira", TEC: "Tecnologia e Inovação",
};
export interface PercentageChange { before: number; after: number; gain: number }
export interface ProvaEvolution {
  participacao: PercentageChange | null;
  acertos: PercentageChange | null;
  subjects: { subject: string; change: PercentageChange | null; before: number | null; after: number | null }[];
  hasBothPeriods: boolean;
}
export function numericPercentage(raw: unknown): number | null {
  if (typeof raw !== "number" && typeof raw !== "string") return null;
  const text = String(raw).trim().replace(",", ".");
  if (!/^\d+(?:\.\d+)?%?$/.test(text)) return null;
  const n = Number(text.replace("%", ""));
  const value = text.endsWith("%") || n > 1 ? n : n * 100;
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}
function change(a: unknown, b: unknown): PercentageChange | null {
  const before = numericPercentage(a), after = numericPercentage(b);
  return before === null || after === null ? null : { before, after, gain: after - before };
}
export function compareProvaPaulista(student: StudentRecord, before?: SchoolPeriod, after?: SchoolPeriod): ProvaEvolution | undefined {
  if (!before || !after || before.year !== after.year || before.term >= after.term) return;
  const key = (p: SchoolPeriod) => JSON.stringify([student.classId, p.year, p.term]);
  const a: ProvaPaulistaRecord | undefined = student.provaPaulistaHistory?.[key(before)];
  const b: ProvaPaulistaRecord | undefined = student.provaPaulistaHistory?.[key(after)];
  return {
    hasBothPeriods: !!a && !!b,
    participacao: change(a?.participacao, b?.participacao),
    acertos: change(a?.acertos, b?.acertos),
    subjects: [...new Set([...Object.keys(a?.grades ?? {}), ...Object.keys(b?.grades ?? {})])].map(subject => ({
      subject, before: numericPercentage(a?.grades[subject]), after: numericPercentage(b?.grades[subject]),
      change: change(a?.grades[subject], b?.grades[subject]),
    })),
  };
}
