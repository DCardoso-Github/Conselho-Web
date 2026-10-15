import * as XLSX from "xlsx";
import { db, type StudentRecord, type ClassRecord } from "../db";
import { TOTAL_LABELS } from "./subjects";

/**
 * Exporta uma turma para um arquivo .xlsx com cabeçalho de duas linhas
 * (disciplina + sub-coluna M/F), bloco TOTAL e mesclas por grupo.
 * Faz download direto no navegador.
 */
export async function exportClassToXlsx(classId: string): Promise<void> {
    const cls = await db.classes.get(classId);
    if (!cls) throw new Error(`Turma "${classId}" não encontrada.`);
    const students = await db.students
        .where("classId")
        .equals(classId)
        .sortBy("order");

    const { rows, merges, colWidths } = buildSheetMatrix(cls, students);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!merges"] = merges;
    ws["!cols"] = colWidths.map((w) => ({ wch: w }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, cls.id.slice(0, 31));
    XLSX.writeFile(wb, `${cls.id}.xlsx`);
}

/** Exporta um bimestre sem alterar o mapão atual. */
export async function exportGradePeriod(id: string): Promise<void> {
    const period = await db.gradePeriods.get(id);
    if (!period) throw new Error("Bimestre não encontrado.");
    const cls: ClassRecord = { id: period.classId, name: period.classId, subjects: period.subjects, importedAt: period.importedAt };
    const students = period.students.map((student) => ({ ...student, classId: period.classId }));
    const { rows, merges, colWidths } = buildSheetMatrix(cls, students);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!merges"] = merges;
    ws["!cols"] = colWidths.map((width) => ({ wch: width }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${period.term}º bimestre`);
    XLSX.writeFile(wb, `${period.classId}_${period.year}_${period.term}bim.xlsx`);
}

function buildSheetMatrix(cls: ClassRecord, students: StudentRecord[]) {
    const subjects = cls.subjects;
    // Estrutura do header (linha 0 = grupo, linha 1 = sub):
    //  ALUNO | SITUACAO | TOTAL: TF, FRE(%), FT AN, FRE AN(%) | <Disc>: M, F | ...
    const top: string[] = [];
    const sub: string[] = [];
    const merges: XLSX.Range[] = [];
    const colWidths: number[] = [];

    // ALUNO (mescla vertical r0..r1)
    let col = 0;
    top.push("ALUNO"); sub.push("");
    merges.push({ s: { r: 0, c: col }, e: { r: 1, c: col } });
    colWidths.push(40);
    col++;

    // SITUACAO
    top.push("SITUACAO"); sub.push("");
    merges.push({ s: { r: 0, c: col }, e: { r: 1, c: col } });
    colWidths.push(12);
    col++;

    // TOTAL group
    const totalStart = col;
    for (const lbl of TOTAL_LABELS) {
        top.push("TOTAL");
        sub.push(lbl);
        colWidths.push(10);
        col++;
    }
    if (TOTAL_LABELS.length > 1) {
        merges.push({ s: { r: 0, c: totalStart }, e: { r: 0, c: totalStart + TOTAL_LABELS.length - 1 } });
    }

    // Subjects: cada um vira (M, F)
    for (const subject of subjects) {
        const start = col;
        top.push(subject); sub.push("M");
        colWidths.push(10);
        col++;
        top.push(subject); sub.push("F");
        colWidths.push(10);
        col++;
        merges.push({ s: { r: 0, c: start }, e: { r: 0, c: start + 1 } });
    }

    const rows: unknown[][] = [top, sub];

    for (const st of students) {
        const r: unknown[] = [];
        r.push(st.name);
        r.push(st.situation || "ATIVO");
        for (const lbl of TOTAL_LABELS) r.push(st.total?.[lbl] ?? null);
        for (const subject of subjects) {
            r.push(st.grades?.[subject] ?? null);
            r.push(st.absences?.[subject] ?? null);
        }
        rows.push(r);
    }

    return { rows, merges, colWidths };
}
