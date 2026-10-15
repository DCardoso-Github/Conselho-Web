import * as XLSX from "xlsx";
import type { SchoolPeriod } from "../db";

export interface PeriodSuggestion {
  period: Partial<SchoolPeriod>;
  message: string;
}

/** Only explicit bimestre labels count: class numbers and grade values never do. */
export function detectMapaoPeriod(fileName: string, buffer: ArrayBuffer): PeriodSuggestion {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1, defval: null, blankrows: false,
  });
  const metadata: string[] = [fileName, sheetName];
  for (const [index, row] of rows.slice(0, 20).entries()) {
    // Stop before student/grade rows so their contents cannot suggest a period.
    if (row.some(cell => /^(aluno|nome do aluno|situacao)\b/.test(normalize(String(cell ?? ""))))) break;
    metadata.push(row.filter(cell => cell !== null).join(" "));
    row.forEach((cell, column) => {
      if (/^bimestre$/.test(normalize(String(cell ?? "")).trim())) {
        const below = String(rows[index + 1]?.[column] ?? "").trim();
        if (/^[1-4]$/.test(below)) metadata.push(`Bimestre ${below}`);
      }
    });
  }
  const words: Record<string, number> = { primeiro: 1, segundo: 2, terceiro: 3, quarto: 4, i: 1, ii: 2, iii: 3, iv: 4 };
  const token = "(?:[1-4]|primeiro|segundo|terceiro|quarto|iv|iii|ii|i)";
  const terms = new Set<number>();
  const years = new Set<number>();
  for (const source of metadata) {
    const text = normalize(source);
    const patterns = [
      new RegExp(`\\b(${token})\\s*(?:bimestre|bim)\\b`, "g"),
      new RegExp(`\\b(?:bimestre|bim)\\s*(${token})\\b`, "g"),
    ];
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) terms.add(words[match[1]] ?? Number(match[1]));
    }
    for (const match of text.matchAll(/\b(20\d{2}|2100)\b/g)) years.add(Number(match[1]));
  }
  // An isolated number in a filename with an identifiable class can be a term.
  // Remove class/year tokens first; never infer a term from a grade in the sheet.
  const filename = normalize(fileName.replace(/\.xlsx$/i, ""));
  const classPattern = /\b\d{1,2}\s*(?:ano|serie)\s*[a-z]\b|\b\d{1,2}[a-z]\b/g;
  if (terms.size === 0 && classPattern.test(filename)) {
    const remaining = filename.replace(classPattern, "").replace(/\b(?:20\d{2}|2100)\b/g, "");
    for (const match of remaining.matchAll(/\b([1-4])\b/g)) terms.add(Number(match[1]));
  }
  const period: Partial<SchoolPeriod> = {};
  if (terms.size === 1) period.term = [...terms][0];
  if (years.size === 1) period.year = [...years][0];
  const conflict = terms.size > 1 || years.size > 1;
  return {
    period,
    message: conflict
      ? "Há indicações de períodos diferentes no arquivo. Confira o ano e selecione o bimestre."
      : period.term
        ? `Bimestre identificado: ${period.term}º. Confira o período antes de importar.`
        : "Bimestre não identificado. Selecione o período antes de importar.",
  };
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[ºª°]/g, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_:./-]+/g, " ");
}
