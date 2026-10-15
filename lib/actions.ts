import * as XLSX from "xlsx";
import { db, type ClassRecord, type StudentRecord } from "./db";
import { parseMapao, type ParsedClass } from "./mapao/parser";
import { normalizeName } from "./mapao/normalize";

/** Remove caracteres de controle e trunca a 255 chars. */
function sanitizeName(s: unknown): string {
    if (typeof s !== "string") return "";
    return s.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, 255);
}

/** Importa um arquivo .xlsx e persiste turma + alunos no IndexedDB. */
export async function importMapaoFile(
    file: File,
): Promise<{ classId: string; studentCount: number; overwritten: boolean }> {
    const buffer = await file.arrayBuffer();
    const parsed = parseMapao(file.name, buffer);
    const overwritten = await persistParsed(parsed);
    const safeId = parsed.className.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, 255);
    return { classId: safeId, studentCount: Math.min(parsed.students.length, 80), overwritten };
}

async function persistParsed(parsed: ParsedClass): Promise<boolean> {
    const safeId = sanitizeName(parsed.className);
    if (!safeId) throw new Error("Nome da turma inválido.");
    const classRecord: ClassRecord = {
        id: safeId,
        name: safeId,
        importedAt: Date.now(),
        subjects: parsed.subjects.slice(0, 45),
    };

    let overwritten = false;
    await db.transaction("rw", db.classes, db.students, async () => {
        const prevClass = await db.classes.get(safeId);
        overwritten = !!prevClass;
        // Preserva fotos e anotações de alunos pré-existentes (casamento por nome).
        const existing = await db.students.where("classId").equals(safeId).toArray();
        const byName = new Map(existing.map((s) => [s.name, s]));

        await db.students.where("classId").equals(safeId).delete();
        await db.classes.put(classRecord);

        const students = parsed.students.slice(0, 80);
        const records: StudentRecord[] = students.map((s, idx) => {
            const safeName = sanitizeName(s.name);
            const prev = byName.get(safeName);
            return {
                classId: safeId,
                name: safeName || `Aluno ${idx + 1}`,
                situation: s.situation,
                total: s.total,
                grades: s.grades,
                absences: s.absences,
                order: idx,
                photo: prev?.photo,
                notes: prev?.notes,
                provaPaulista: prev?.provaPaulista,
                frequenciaAnual: prev?.frequenciaAnual,
                tutor: prev?.tutor,
                educacaoEspecial: prev?.educacaoEspecial,
                tutoriaMatematica: prev?.tutoriaMatematica,
                tutoriaPortugues: prev?.tutoriaPortugues,
                programaSouMais: prev?.programaSouMais,
                outrasInformacoes: prev?.outrasInformacoes,
            };
        });
        if (records.length > 0) await db.students.bulkAdd(records);
    });
    return overwritten;
}

/** Substitui notas/faltas/anotações de um aluno. */
export async function updateStudent(
    id: number,
    patch: Partial<StudentRecord>,
): Promise<void> {
    await db.students.update(id, patch);
}

/** Define a foto de um aluno (Blob JPEG já redimensionada). */
export async function setStudentPhoto(id: number, photo: Blob): Promise<void> {
    await db.students.update(id, { photo });
}

/** Apaga uma turma e todos os seus alunos. */
export async function deleteClass(classId: string): Promise<void> {
    await db.transaction("rw", db.classes, db.students, async () => {
        await db.students.where("classId").equals(classId).delete();
        await db.classes.delete(classId);
    });
}

/** Considera nota "vermelha" (≤ 4, igual ao Python). */
export function isLowGrade(value: unknown, limit = 4): boolean {
    if (value === null || value === undefined) return false;
    const s = String(value).trim().replace(",", ".");
    const n = Number(s);
    if (Number.isNaN(n)) return false;
    return n <= limit;
}

/** Filtra alunos com pelo menos uma nota vermelha. */
export function studentsWithLowGrade(students: StudentRecord[], limit = 4): StudentRecord[] {
    return students.filter((s) => Object.values(s.grades).some((g) => isLowGrade(g, limit)));
}

export interface ProvaPaulistaImportResult {
    matched: number;
    unmatched: string[];
}

function cellToValuePP(v: unknown): string | number | null {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return v;
    let s = String(v).trim();
    if (s === "" || s === "-") return null;
    const isPct = s.endsWith("%");
    if (isPct) {
        s = s.slice(0, -1).trim();
    }
    const n = Number(s.replace(",", "."));
    if (!Number.isNaN(n) && /^-?\d+([.,]\d+)?$/.test(s)) {
        return n;
    }
    return s;
}

export async function importProvaPaulista(
    classId: string,
    file: File
): Promise<ProvaPaulistaImportResult> {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        defval: null,
        blankrows: false,
        raw: true,
    });

    if (rows.length === 0) {
        throw new Error("A planilha está vazia.");
    }

    // Encontra a linha de cabeçalho
    let headerRowIdx = -1;
    const limit = Math.min(rows.length, 20);
    for (let i = 0; i < limit; i++) {
        const row = rows[i] || [];
        const hasAluno = row.some((cell) => {
            if (cell == null) return false;
            const norm = normalizeName(String(cell));
            return norm.includes("ALUNO") || norm.includes("ESTUDANTE") || norm.includes("NOME");
        });
        if (hasAluno) {
            headerRowIdx = i;
            break;
        }
    }

    if (headerRowIdx === -1) {
        throw new Error("Não foi possível identificar a coluna do Aluno(a) na planilha.");
    }

    const header = rows[headerRowIdx].map((cell) =>
        cell == null ? "" : normalizeName(String(cell))
    );

    // Mapeia índices de colunas
    let alunoColIdx = -1;
    let participacaoColIdx = -1;
    let acertosColIdx = -1;
    const subjectColIdxs: Record<string, number> = {};

    const cleanName = (n: string) => n.replace(/[^A-Z]/g, "");

    for (let i = 0; i < header.length; i++) {
        const h = header[i];
        if (alunoColIdx === -1 && (h.includes("ALUNO") || h.includes("ESTUDANTE") || h.includes("NOME"))) {
            alunoColIdx = i;
        } else if (participacaoColIdx === -1 && (h.includes("PARTICIPACAO") || h.includes("PARTICIPAC"))) {
            participacaoColIdx = i;
        } else if (acertosColIdx === -1 && h.includes("ACERTOS")) {
            acertosColIdx = i;
        } else {
            // Verifica se corresponde a alguma disciplina PP: MAT, PORT, ING, HIST, GEO, CIE, FIN, TEC
            const cleanH = cleanName(h);
            for (const subj of ["MAT", "PORT", "ING", "HIST", "GEO", "CIE", "FIN", "TEC"]) {
                if (cleanH === subj || cleanH.startsWith(subj)) {
                    subjectColIdxs[subj] = i;
                } else if (subj === "MAT" && (cleanH.includes("MATEMATICA") || cleanH === "MAT")) {
                    subjectColIdxs[subj] = i;
                } else if (subj === "PORT" && (cleanH.includes("PORTUGUESA") || cleanH.includes("PORTUGUES") || cleanH === "PORT")) {
                    subjectColIdxs[subj] = i;
                } else if (subj === "ING" && (cleanH.includes("INGLESA") || cleanH.includes("INGLES") || cleanH === "ING")) {
                    subjectColIdxs[subj] = i;
                } else if (subj === "HIST" && (cleanH.includes("HISTORIA") || cleanH === "HIST")) {
                    subjectColIdxs[subj] = i;
                } else if (subj === "GEO" && (cleanH.includes("GEOGRAFIA") || cleanH === "GEO")) {
                    subjectColIdxs[subj] = i;
                } else if (subj === "CIE" && (cleanH.includes("CIENCIAS") || cleanH === "CIE")) {
                    subjectColIdxs[subj] = i;
                } else if (subj === "FIN" && (cleanH.includes("FINANCEIRA") || cleanH === "FIN")) {
                    subjectColIdxs[subj] = i;
                } else if (subj === "TEC" && (cleanH.includes("TECNOLOGIA") || cleanH.includes("INOVACAO") || cleanH === "TEC")) {
                    subjectColIdxs[subj] = i;
                }
            }
        }
    }

    if (alunoColIdx === -1) {
        throw new Error("Não foi possível identificar a coluna do Aluno(a).");
    }

    // Pega todos os alunos da turma no banco
    const studentsInDb = await db.students.where("classId").equals(classId).toArray();
    const studentsByName = new Map(studentsInDb.map((s) => [s.name, s]));

    let matchedCount = 0;
    const unmatchedNames: string[] = [];

    // Começa transação para atualizar os dados
    await db.transaction("rw", db.students, async () => {
        for (let r = headerRowIdx + 1; r < rows.length; r++) {
            const row = rows[r] || [];
            const rawName = row[alunoColIdx];
            if (rawName == null || String(rawName).trim() === "") continue;

            const normName = normalizeName(String(rawName));
            const student = studentsByName.get(normName);

            if (!student || student.id === undefined) {
                unmatchedNames.push(String(rawName));
                continue;
            }

            // Lê dados da Prova Paulista
            const participacao = participacaoColIdx !== -1 ? cellToValuePP(row[participacaoColIdx]) : null;
            const acertos = acertosColIdx !== -1 ? cellToValuePP(row[acertosColIdx]) : null;

            const grades: Record<string, string | number | null> = {};
            for (const [subj, idx] of Object.entries(subjectColIdxs)) {
                grades[subj] = cellToValuePP(row[idx]);
            }

            const ppRecord = {
                participacao,
                acertos,
                grades,
            };

            await db.students.update(student.id, {
                provaPaulista: ppRecord,
            });
            matchedCount++;
        }
    });

    return {
        matched: matchedCount,
        unmatched: unmatchedNames,
    };
}

export async function importFrequenciaTutor(
    classId: string,
    file: File,
): Promise<{ matched: number; unmatched: string[] }> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
        throw new Error("Planilha vazia.");
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

    let headerRowIdx = -1;
    let alunoColIdx = -1;
    let freqColIdx = -1;
    let tutorColIdx = -1;

    // Achar cabeçalho
    for (let r = 0; r < Math.min(rows.length, 15); r++) {
        const row = rows[r] || [];
        for (let i = 0; i < row.length; i++) {
            const val = String(row[i] || "")
                .trim()
                .toUpperCase()
                .normalize("NFKD")
                .replace(/[\u0300-\u036f]/g, "");

            if (
                val === "ALUNO" ||
                val === "ALUNO(A)" ||
                val === "ESTUDANTE" ||
                val.includes("NOME DO ALUNO") ||
                val.includes("NOME")
            ) {
                alunoColIdx = i;
                headerRowIdx = r;
            }
        }
        if (alunoColIdx !== -1) {
            // Achar outras colunas na mesma linha do cabeçalho
            const headerRow = rows[r] || [];
            for (let i = 0; i < headerRow.length; i++) {
                const val = String(headerRow[i] || "")
                    .trim()
                    .toUpperCase()
                    .normalize("NFKD")
                    .replace(/[\u0300-\u036f]/g, "");

                if (val.includes("TUTOR") || val.includes("TUTOR(A)")) {
                    tutorColIdx = i;
                } else if (
                    val.includes("FREQUENCIA ANUAL") ||
                    val.includes("FREQ ANUAL") ||
                    val.includes("FREQUENCIA") ||
                    val.includes("FREQ") ||
                    (val.includes("FREQ") && val.includes("AN"))
                ) {
                    freqColIdx = i;
                }
            }
            break;
        }
    }

    if (alunoColIdx === -1) {
        throw new Error("Não foi possível identificar a coluna do Aluno(a).");
    }

    // Pega todos os alunos da turma no banco
    const studentsInDb = await db.students.where("classId").equals(classId).toArray();
    const studentsByName = new Map(studentsInDb.map((s) => [s.name, s]));

    let matchedCount = 0;
    const unmatchedNames: string[] = [];

    // Começa transação para atualizar os dados
    await db.transaction("rw", db.students, async () => {
        for (let r = headerRowIdx + 1; r < rows.length; r++) {
            const row = rows[r] || [];
            const rawName = row[alunoColIdx];
            if (rawName == null || String(rawName).trim() === "") continue;

            const normName = normalizeName(String(rawName));
            const student = studentsByName.get(normName);

            if (!student || student.id === undefined) {
                unmatchedNames.push(String(rawName));
                continue;
            }

            // Lê dados de frequência e tutor
            let freqVal: string | number | null = null;
            if (freqColIdx !== -1) {
                freqVal = cellToValuePP(row[freqColIdx]);
            }
            
            const tutorVal = tutorColIdx !== -1 && row[tutorColIdx] != null ? String(row[tutorColIdx]).trim() : null;

            await db.students.update(student.id, {
                frequenciaAnual: freqVal,
                tutor: tutorVal,
            });
            matchedCount++;
        }
    });

    return {
        matched: matchedCount,
        unmatched: unmatchedNames,
    };
}
