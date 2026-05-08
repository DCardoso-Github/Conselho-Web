import { db, type ClassRecord, type StudentRecord } from "./db";
import { parseMapao, type ParsedClass } from "./mapao/parser";

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
            };
        });
        if (records.length > 0) await db.students.bulkAdd(records);
    });
    return overwritten;
}

/** Substitui notas/faltas/anotações de um aluno. */
export async function updateStudent(
    id: number,
    patch: Partial<Pick<StudentRecord, "grades" | "absences" | "notes" | "total">>,
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
