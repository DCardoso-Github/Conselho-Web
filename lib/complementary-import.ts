import * as XLSX from "xlsx";
import { db, type ClassRecord, type ProvaPaulistaRecord, type SchoolPeriod, type StudentRecord } from "./db";
import { nameKey, periodId, periodOrder } from "./evolution";
import { validatePeriod } from "./grade-history";
import { detectMapaoPeriod } from "./mapao/period";

export type ComplementaryKind = "pp" | "attendance";
type ImportRow = { name: string; pp?: Partial<ProvaPaulistaRecord>; attendance?: Pick<Partial<StudentRecord>, "frequenciaAnual" | "tutor"> };
export interface ComplementarySheet {
  name: string;
  rows: ImportRow[];
  suggestedClassId: string;
  hidden: boolean;
  error?: string;
}
export interface ComplementaryPreview {
  fileName: string;
  kind: ComplementaryKind;
  sheets: ComplementarySheet[];
  classes: ClassRecord[];
  suggestedPeriod: Partial<SchoolPeriod>;
}
export interface ComplementaryImportResult {
  matched: number;
  unmatched: string[];
  sheets: { sheet: string; classId: string; matched: number; unmatched: string[] }[];
}
export type SheetAssignment = { index: number; classId: string };

const subjectAliases: Record<string, string[]> = {
  MAT: ["MAT", "MATEMATICA"], PORT: ["PORT", "PORTUGUES", "LINGUA PORTUGUESA"],
  ING: ["ING", "INGLES", "LINGUA INGLESA"], HIST: ["HIST", "HISTORIA"],
  GEO: ["GEO", "GEOGRAFIA"], CIE: ["CIE", "CIENCIAS"],
  FIN: ["FIN", "EDUCACAO FINANCEIRA"], TEC: ["TEC", "TECNOLOGIA E INOVACAO"],
};
const norm = (value: unknown) => nameKey(String(value ?? "").replace(/[ºª°]/g, "")).replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const isStudentHeader = (value: string) => !value.includes("TUTOR") && /^(ALUNO|ESTUDANTE|NOME)(\b|$)/.test(value);
function field(header: string, kind: ComplementaryKind): string | undefined {
  if (isStudentHeader(header)) return "name";
  if (kind === "attendance") {
    if (header.includes("TUTOR")) return "tutor";
    if (/\b(FREQUENCIA|FREQ|FRE)\b/.test(header) ||
        /\bPRESENCA\b/.test(header) && /\bANUAL\b/.test(header)) return "frequenciaAnual";
    return;
  }
  if (header.includes("PARTICIPAC")) return "participacao";
  if (header.includes("ACERTO")) return "acertos";
  return Object.keys(subjectAliases).find(key => subjectAliases[key].some(alias => header === alias || header.startsWith(`${alias} `)));
}

// Keep explicit percentages explicit: 1% must not be interpreted as a fraction (100%).
function value(cell?: XLSX.CellObject): string | number | null {
  const raw = cell?.v;
  if (raw === null || raw === undefined || String(raw).trim() === "" || String(raw).trim() === "-") return null;
  if (typeof raw === "number") return String(cell?.z ?? "").includes("%") ? `${raw * 100}%` : raw;
  const text = String(raw).trim();
  if (text.endsWith("%")) return text;
  return /^-?\d+(?:[.,]\d+)?$/.test(text) ? Number(text.replace(",", ".")) : text;
}

function parseSheet(name: string, ws: XLSX.WorkSheet, kind: ComplementaryKind, hidden: boolean): ComplementarySheet {
  const result: ComplementarySheet = { name, rows: [], suggestedClassId: "", hidden };
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, blankrows: true, range: 0 });
  let headerIndex = -1;
  let columns: (string | undefined)[] = [];
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const candidate = rows[i].map(cell => field(norm(cell), kind));
    if (candidate.includes("name") && candidate.some(key => key && key !== "name")) {
      headerIndex = i; columns = candidate; break;
    }
  }
  if (headerIndex < 0) return { ...result, error: "Cabeçalho não reconhecido. Inclua Aluno(a) e as colunas de resultados." };
  const named = columns.filter(Boolean);
  if (new Set(named).size !== named.length) return { ...result, error: "Há colunas repetidas. Confira os cabeçalhos." };
  const nameColumn = columns.indexOf("name");
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const name = nameKey(String(rows[i][nameColumn] ?? ""));
    if (!name || isStudentHeader(norm(name)) && /^(ALUNO|ALUNO A|NOME|ESTUDANTE)$/.test(norm(name))) continue;
    const row: ImportRow = { name };
    if (kind === "pp") row.pp = { grades: {} };
    else row.attendance = {};
    columns.forEach((key, column) => {
      if (!key || key === "name") return;
      const cell = ws[XLSX.utils.encode_cell({ r: i, c: column })];
      if (key === "tutor") row.attendance!.tutor = cell?.v == null ? null : String(cell.v).trim() || null;
      else if (key === "frequenciaAnual") row.attendance!.frequenciaAnual = value(cell);
      else if (key === "participacao" || key === "acertos") row.pp![key] = value(cell);
      else row.pp!.grades![key] = value(cell);
    });
    result.rows.push(row);
  }
  if (!result.rows.length) result.error = "Nenhum aluno encontrado nesta aba.";
  if (new Set(result.rows.map(row => row.name)).size !== result.rows.length) result.error = "Há nomes repetidos nesta aba. Corrija-os antes de importar.";
  return result;
}

/** Only a clear class token or exact saved name can route a sheet automatically. */
function suggestClass(sheet: string, classes: ClassRecord[], fallback?: string) {
  const exact = classes.filter(cls => norm(cls.id) === norm(sheet) || norm(cls.name) === norm(sheet));
  if (exact.length === 1) return exact[0].id;
  const tokens = [...norm(sheet).matchAll(/\b(\d{1,2})\s*(?:(?:ANO|SERIE)\s*)?([A-Z])\b/g)].map(m => `${Number(m[1])}${m[2]}`);
  const matches = classes.filter(cls => tokens.includes(norm(cls.id).replace(/ /g, "")));
  if (tokens.length) return matches.length === 1 ? matches[0].id : "";
  return fallback ?? "";
}

export async function prepareComplementaryImport(classId: string, file: File, kind: ComplementaryKind): Promise<ComplementaryPreview> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", cellNF: true });
  if (!wb.SheetNames.length) throw new Error("A planilha está vazia.");
  const classes = await db.classes.toArray();
  const sheets = wb.SheetNames.map((name, i) => parseSheet(name, wb.Sheets[name], kind, !!wb.Workbook?.Sheets?.[i]?.Hidden));
  for (const sheet of sheets) {
    sheet.suggestedClassId = sheet.error || sheet.hidden ? "" : suggestClass(sheet.name, classes, sheets.length === 1 && classes.some(cls => cls.id === classId) ? classId : undefined);
  }
  const current = classes.find(cls => cls.id === classId)?.currentPeriod;
  const suggestion = kind === "pp" ? detectMapaoPeriod(file.name, buffer).period : {};
  return { fileName: file.name, kind, sheets, classes, suggestedPeriod: { ...current, ...suggestion } };
}

export async function applyComplementaryImport(preview: ComplementaryPreview, assignments: SheetAssignment[], period?: SchoolPeriod): Promise<ComplementaryImportResult> {
  if (!assignments.length) throw new Error("Selecione pelo menos uma aba e sua turma.");
  if (period) validatePeriod(period);
  if (new Set(assignments.map(a => a.index)).size !== assignments.length || new Set(assignments.map(a => a.classId)).size !== assignments.length) throw new Error("Selecione apenas uma aba por turma em cada importação.");
  return db.transaction("rw", db.classes, db.students, async () => {
    const result: ComplementaryImportResult = { matched: 0, unmatched: [], sheets: [] };
    for (const assignment of assignments) {
      const sheet = preview.sheets[assignment.index];
      const cls = await db.classes.get(assignment.classId);
      if (!sheet || sheet.error || !cls) throw new Error("Confira as abas e as turmas selecionadas antes de importar.");
      if (period && cls.currentPeriod && period.year !== cls.currentPeriod.year) throw new Error(`A turma ${cls.name} está no ano ${cls.currentPeriod.year}. Confira o ano da Prova Paulista.`);
      const students = await db.students.where("classId").equals(cls.id).toArray();
      const names = students.map(s => nameKey(s.name));
      if (new Set(names).size !== names.length) throw new Error(`Há alunos com nomes repetidos na turma ${cls.name}. Corrija-os antes de importar.`);
      const byName = new Map(students.map(s => [nameKey(s.name), s]));
      const report = { sheet: sheet.name, classId: cls.id, matched: 0, unmatched: [] as string[] };
      for (const row of sheet.rows) {
        const student = byName.get(row.name);
        if (student?.id === undefined) { report.unmatched.push(row.name); continue; }
        if (preview.kind === "attendance") await db.students.update(student.id, row.attendance!);
        else {
          const key = period ? periodId(cls.id, period) : undefined;
          const previous = key ? student.provaPaulistaHistory?.[key] : student.provaPaulista;
          const pp: ProvaPaulistaRecord = { participacao: null, acertos: null, ...previous, ...row.pp, grades: { ...previous?.grades, ...row.pp?.grades } };
          const patch: Partial<StudentRecord> = {};
          if (key && period) {
            patch.provaPaulistaHistory = { ...student.provaPaulistaHistory, [key]: pp };
            if (!student.provaPaulistaPeriod || periodOrder(period) >= periodOrder(student.provaPaulistaPeriod)) {
              patch.provaPaulista = pp; patch.provaPaulistaPeriod = period;
            }
          } else { patch.provaPaulista = pp; patch.provaPaulistaPeriod = undefined; }
          await db.students.update(student.id, patch);
        }
        report.matched++;
      }
      result.sheets.push(report);
      result.matched += report.matched;
      result.unmatched.push(...report.unmatched.map(name => `${cls.name} · ${name}`));
    }
    return result;
  });
}

/** Compatibility entry point; review UI uses explicit assignments instead. */
export async function importComplementary(classId: string, file: File, kind: ComplementaryKind, period?: SchoolPeriod) {
  const preview = await prepareComplementaryImport(classId, file, kind);
  const dataSheets = preview.sheets.filter(sheet => !sheet.hidden);
  if (dataSheets.some(sheet => sheet.error || !sheet.suggestedClassId)) throw new Error("Confira a turma de cada aba na revisão da importação.");
  return applyComplementaryImport(preview, preview.sheets.flatMap((sheet, index) => sheet.hidden ? [] : [{ index, classId: sheet.suggestedClassId }]), period);
}
