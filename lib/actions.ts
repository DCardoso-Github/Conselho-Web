import { importComplementary } from "./complementary-import";
import { db, type StudentRecord } from "./db";
import { parseMapao } from "./mapao/parser";
import { persistMapao, syncCurrentPeriod, type MapaoImportOptions } from "./grade-history";
import type { SchoolPeriod } from "./db";

/** Importa o mapão com seu período, preservando o histórico e os dados do aluno. */
export async function importMapaoFile(file: File, options: MapaoImportOptions = {}) {
    const parsed = parseMapao(file.name, await file.arrayBuffer());
    return persistMapao(parsed, options);
}

/** Substitui notas/faltas/anotações de um aluno. */
export async function updateStudent(
    id: number,
    patch: Partial<StudentRecord>,
): Promise<void> {
    await db.transaction("rw", db.classes, db.students, db.gradePeriods, async () => {
        await db.students.update(id, patch);
        const student = await db.students.get(id);
        if (student) await syncCurrentPeriod(student.classId);
    });
}

/** Define a foto de um aluno (Blob JPEG já redimensionada). */
export async function setStudentPhoto(id: number, photo: Blob): Promise<void> {
    await db.students.update(id, { photo });
}

/** Remove o aluno da turma atual, preservando os retratos dos bimestres anteriores. */
export async function deleteStudent(classId: string, studentId: number): Promise<void> {
    return deleteStudents(classId, [studentId]);
}

/** Exclui toda a seleção em uma transação, sem exclusões parciais. */
export async function deleteStudents(classId: string, studentIds: number[]): Promise<void> {
    const ids = [...new Set(studentIds)];
    if (!ids.length) throw new Error("Selecione pelo menos um aluno.");
    await db.transaction("rw", db.classes, db.students, db.gradePeriods, async () => {
        const students = await db.students.bulkGet(ids);
        if (students.some(student => !student || student.classId !== classId)) {
            throw new Error("Aluno não encontrado nesta turma.");
        }
        await db.students.bulkDelete(ids);
        await syncCurrentPeriod(classId);
    });
}

/** Apaga uma turma, seus alunos e todos os bimestres salvos. */
export async function deleteClass(classId: string): Promise<void> {
    await db.transaction("rw", db.classes, db.students, db.gradePeriods, async () => {
        await db.students.where("classId").equals(classId).delete();
        await db.gradePeriods.where("classId").equals(classId).delete();
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

export type { ComplementaryImportResult as ProvaPaulistaImportResult } from "./complementary-import";

export function importProvaPaulista(classId: string, file: File, period?: SchoolPeriod) {
    return importComplementary(classId, file, "pp", period);
}

export function importFrequenciaTutor(classId: string, file: File) {
    return importComplementary(classId, file, "attendance");
}