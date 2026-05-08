import * as XLSX from "xlsx";
import { compactKey, normalizeName } from "./normalize";
import { SUBJECTS, TOTAL_LABELS, type TotalLabel } from "./subjects";
import { extractClassName } from "./className";

export interface ParsedStudent {
    name: string;
    situation: string;
    total: Partial<Record<TotalLabel, string | number | null>>;
    grades: Record<string, string | number | null>;
    absences: Record<string, string | number | null>;
}

export interface ParsedClass {
    className: string;
    subjects: string[]; // ordem original
    students: ParsedStudent[];
}

const EMPTY = ["", "-", "S/N"];

function cellToValue(v: unknown): string | number | null {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return v;
    const s = String(v).trim();
    if (s === "" || s === "-") return null;
    // tenta converter para número
    const n = Number(s.replace(",", "."));
    if (!Number.isNaN(n) && /^-?\d+([.,]\d+)?$/.test(s)) return n;
    return s;
}

/**
 * Lê um workbook a partir de um ArrayBuffer (.xlsx) e retorna a primeira aba
 * convertida em uma matriz de células (linhas x colunas), preservando posições vazias.
 */
function readSheetAsAOA(buffer: ArrayBuffer): unknown[][] {
    const wb = XLSX.read(buffer, { type: "array", cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        defval: null,
        blankrows: false,
        raw: true,
    });
    return aoa;
}

/**
 * Identifica a linha de cabeçalho onde aparecem "ALUNO" / "SITUAÇÃO".
 * Espelha lógica do conselho.py.
 */
function findHeaderRow(rows: unknown[][]): number {
    const limit = Math.min(rows.length, 20);
    for (let i = 0; i < limit; i++) {
        const row = rows[i] || [];
        for (const cell of row) {
            if (cell == null) continue;
            const t = normalizeName(String(cell));
            if (t.includes("ALUNO") || t.includes("SITUACAO")) {
                return i;
            }
        }
    }
    return 0;
}

/**
 * Constrói um cabeçalho composto (linha N + N+1) propagando merges horizontais
 * no nível superior. No mapão original, a linha N tem o nome da disciplina mesclado
 * sobre as colunas M/F (sub-cabeçalho) — quando exportado a CSV/AOA, a célula
 * fica preenchida só na primeira coluna do grupo. Aqui propagamos para a direita
 * até encontrar outro nome.
 */
function buildHeader(rows: unknown[][], headerRow: number): Array<[string, string]> {
    const top = rows[headerRow] || [];
    const sub = rows[headerRow + 1] || [];
    const width = Math.max(top.length, sub.length);
    const out: Array<[string, string]> = [];
    let lastTop = "";
    for (let i = 0; i < width; i++) {
        const rawTop = top[i];
        const rawSub = sub[i];
        if (rawTop != null && String(rawTop).trim() !== "") {
            lastTop = normalizeName(String(rawTop));
        }
        const subN = rawSub == null ? "" : normalizeName(String(rawSub));
        out.push([lastTop, subN]);
    }
    return out;
}

/** Remove sufixos de código SED deixados pelo cabeçalho composto. */
function stripCode(top: string): string {
    // Ex.: "ARTE /N 1813" -> "ARTE"
    // Ex.: "ROBOTICA 55205" -> "ROBOTICA"
    return top
        .replace(/\s*\/N\s+\d+/g, "")   // " /N 1813"
        .replace(/\s+\d{4,6}$/, "")      // " 55205" (código SED numérico no fim)
        .trim();
}

/**
 * Detecta colunas relevantes:
 *  - ALUNO (single)
 *  - SITUAÇÃO (single)
 *  - TOTAL: TF, FRE(%), FT AN, FRE AN(%)
 *  - Disciplinas conhecidas: pares (M=nota, F=faltas)
 */
interface ColumnMap {
    aluno: number;
    situacao: number;
    total: Partial<Record<TotalLabel, number>>;
    subjects: Array<{ name: string; mIdx: number; fIdx: number }>;
}

function mapColumns(header: Array<[string, string]>): ColumnMap {
    const result: ColumnMap = {
        aluno: -1,
        situacao: -1,
        total: {},
        subjects: [],
    };

    // ALUNO / SITUACAO
    for (let i = 0; i < header.length; i++) {
        const [top] = header[i];
        if (result.aluno < 0 && top.startsWith("ALUNO")) result.aluno = i;
        if (result.situacao < 0 && (top.startsWith("SITUACAO") || top.startsWith("SITUAÇÃO")))
            result.situacao = i;
    }

    // TOTAL
    const totalSet = new Set<string>(TOTAL_LABELS.map((l) => compactKey(l)));
    for (let i = 0; i < header.length; i++) {
        const [, sub] = header[i];
        const k = compactKey(sub);
        if (totalSet.has(k)) {
            // descobre qual label é
            for (const lbl of TOTAL_LABELS) {
                if (compactKey(lbl) === k && result.total[lbl] === undefined) {
                    result.total[lbl] = i;
                    break;
                }
            }
        }
    }

    // Disciplinas: qualquer cabeçalho superior (que NÃO seja ALUNO/SITUACAO/TOTAL)
    // com pares de sub-colunas M (nota) e F (faltas).
    // Preserva a ordem de aparição no mapão e tolera variações no dicionário.
    const groups = new Map<string, { mIdx: number; fIdx: number; firstCol: number }>();
    const reservedTops = new Set<string>(["ALUNO", "SITUACAO", "SITUAÇÃO", "TOTAL"]);
    for (let i = 0; i < header.length; i++) {
        const [topRaw, sub] = header[i];
        const top = stripCode(topRaw);
        if (!top) continue;
        if (reservedTops.has(top)) continue;
        const subC = compactKey(sub);
        // ignora se sub-coluna não é M ou F (evita duplicar TOTAL)
        if (subC !== "M" && subC !== "F") continue;
        const g = groups.get(top) ?? { mIdx: -1, fIdx: -1, firstCol: i };
        if (subC === "M" && g.mIdx < 0) g.mIdx = i;
        if (subC === "F" && g.fIdx < 0) g.fIdx = i;
        groups.set(top, g);
    }
    // Resolve nome canônico via dicionário (se existir entrada equivalente).
    const canonByNorm = new Map<string, string>();
    for (const k of Object.keys(SUBJECTS)) {
        canonByNorm.set(normalizeName(k), k);
    }
    const ordered = [...groups.entries()]
        .filter(([, g]) => g.mIdx >= 0 && g.fIdx >= 0)
        .sort((a, b) => a[1].firstCol - b[1].firstCol);
    for (const [top, g] of ordered) {
        const canonical = canonByNorm.get(top) ?? top;
        result.subjects.push({ name: canonical, mIdx: g.mIdx, fIdx: g.fIdx });
    }

    return result;
}

/**
 * Parser principal: replica SheetManager.import_sheet do conselho.py.
 */
export function parseMapao(fileName: string, buffer: ArrayBuffer): ParsedClass {
    const className = extractClassName(fileName);
    const rows = readSheetAsAOA(buffer);
    if (rows.length === 0) {
        return { className, subjects: [], students: [] };
    }
    const headerRow = findHeaderRow(rows);
    const header = buildHeader(rows, headerRow);
    const cols = mapColumns(header);

    const dataStart = headerRow + 2;
    const students: ParsedStudent[] = [];

    for (let r = dataStart; r < rows.length; r++) {
        const row = rows[r] || [];
        const rawName = cols.aluno >= 0 ? row[cols.aluno] : null;
        if (rawName == null || String(rawName).trim() === "") continue;

        // FILTRO PRIMÁRIO: só aceita situação explícita "ATIVO".
        // Linhas de legenda no rodapé do mapão (LEGENDA, M - MENCAO, ES/ET/EP, etc.)
        // têm situação vazia ou ausente — devem ser rejeitadas.
        const situation = cols.situacao >= 0 ? normalizeName(String(row[cols.situacao] ?? "")) : "";
        if (cols.situacao >= 0) {
            if (situation !== "ATIVO") continue;
        } else {
            // Sem coluna de situação: usa heurística — exigir pelo menos 1/3 das colunas
            // de notas (M) preenchidas, ou pelo menos um valor TOTAL.
            const totalFilled = Object.values(cols.total).some(
                (idx) => idx !== undefined && cellToValue(row[idx]) !== null,
            );
            const gradeFilled = cols.subjects.filter(
                (s) => cellToValue(row[s.mIdx]) !== null,
            ).length;
            if (!totalFilled && gradeFilled < Math.max(1, Math.ceil(cols.subjects.length / 3))) {
                continue;
            }
        }

        const name = normalizeName(String(rawName));
        if (!name) continue;

        const total: ParsedStudent["total"] = {};
        for (const lbl of TOTAL_LABELS) {
            const idx = cols.total[lbl];
            if (idx !== undefined) total[lbl] = cellToValue(row[idx]);
        }

        const grades: ParsedStudent["grades"] = {};
        const absences: ParsedStudent["absences"] = {};
        for (const s of cols.subjects) {
            grades[s.name] = cellToValue(row[s.mIdx]);
            absences[s.name] = cellToValue(row[s.fIdx]);
        }

        students.push({ name, situation: situation || "ATIVO", total, grades, absences });
    }

    return {
        className,
        subjects: cols.subjects.map((s) => s.name),
        students,
    };
}

/** Considera "vazio" valores nulos ou marcadores S/N, "-", "". */
export function isEmptyValue(v: unknown): boolean {
    if (v === null || v === undefined) return true;
    return EMPTY.includes(String(v).trim());
}
