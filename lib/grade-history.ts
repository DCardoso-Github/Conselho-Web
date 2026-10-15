import {
  db,
  type ClassRecord,
  type GradePeriodRecord,
  type SchoolPeriod,
  type StudentRecord,
} from "./db";
import type { ParsedClass } from "./mapao/parser";
import { nameKey, periodId, periodLabel, periodOrder } from "./evolution";

export interface MapaoImportOptions {
  period?: SchoolPeriod;
  expectedClassId?: string;
  replace?: boolean;
}

export function validatePeriod(period: SchoolPeriod) {
  if (
    !Number.isInteger(period.year) ||
    period.year < 2000 ||
    period.year > 2100 ||
    !Number.isInteger(period.term) ||
    period.term < 1 ||
    period.term > 4
  )
    throw new Error("Informe um ano entre 2000 e 2100 e um bimestre de 1 a 4.");
}

export function snapshot(
  cls: ClassRecord,
  students: StudentRecord[],
  period: SchoolPeriod,
): GradePeriodRecord {
  return {
    ...period,
    id: periodId(cls.id, period),
    classId: cls.id,
    importedAt: Date.now(),
    subjects: [...cls.subjects],
    students: students.map(
      ({ name, situation, total, grades, absences, order }) => ({
        name,
        situation,
        total,
        grades,
        absences,
        order,
      }),
    ),
  };
}

/** Identifica os dados legados sem alterar notas, IDs ou informações complementares. */
export async function identifyCurrentPeriod(
  classId: string,
  period: SchoolPeriod,
) {
  validatePeriod(period);
  await db.transaction(
    "rw",
    db.classes,
    db.students,
    db.gradePeriods,
    async () => {
      const cls = await db.classes.get(classId);
      if (!cls) throw new Error("Turma não encontrada.");
      if (cls.currentPeriod)
        throw new Error("O mapão atual já tem um bimestre identificado.");
      if (await db.gradePeriods.get(periodId(classId, period)))
        throw new Error("Este bimestre já está salvo.");
      const students = await db.students
        .where("classId")
        .equals(classId)
        .sortBy("order");
      await db.gradePeriods.put(snapshot(cls, students, period));
      await db.classes.update(classId, { currentPeriod: period });
    },
  );
}

/** Importação atômica: bimestres antigos entram no histórico, o mais recente fica ativo. */
export async function persistMapao(
  parsed: ParsedClass,
  options: MapaoImportOptions = {},
) {
  const classId = parsed.className
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim()
    .slice(0, 255);
  if (!classId) throw new Error("Nome da turma inválido.");
  if (options.expectedClassId && options.expectedClassId !== classId)
    throw new Error(
      `O arquivo é da turma ${classId}. Selecione um mapão da turma ${options.expectedClassId}.`,
    );
  if (!parsed.students.length || !parsed.subjects.length)
    throw new Error(
      "Nenhum aluno ativo ou disciplina foi identificado. Confira o formato do mapão.",
    );
  if (parsed.students.length > 80 || parsed.subjects.length > 45)
    throw new Error(
      "O mapão excede o limite de 80 alunos ou 45 disciplinas. Confira o arquivo.",
    );
  if (options.period) validatePeriod(options.period);
  const keys = parsed.students.map((student) => nameKey(student.name));
  if (new Set(keys).size !== keys.length)
    throw new Error(
      "Há nomes de alunos repetidos no mapão. Corrija-os antes de importar para evitar associações incorretas.",
    );

  return db.transaction(
    "rw",
    db.classes,
    db.students,
    db.gradePeriods,
    async () => {
      const prevClass = await db.classes.get(classId);
      const period = options.period ?? prevClass?.currentPeriod;
      if (options.period && prevClass && !prevClass.currentPeriod)
        throw new Error(
          `Primeiro identifique o bimestre do mapão atual em Gerenciar turma → Mapões e bimestres (${classId}).`,
        );
      if (
        period &&
        prevClass?.currentPeriod &&
        period.year !== prevClass.currentPeriod.year
      )
        throw new Error(
          `Esta turma é de ${prevClass.currentPeriod.year}. Importe bimestres do mesmo ano para não misturar os alunos.`,
        );
      const exists = period
        ? await db.gradePeriods.get(periodId(classId, period))
        : undefined;
      if (exists && !options.replace)
        throw new Error(
          `${periodLabel(period!)} já está salvo. Marque a opção de substituir este bimestre para atualizar suas notas.`,
        );
      const existing = await db.students
        .where("classId")
        .equals(classId)
        .toArray();
      if (prevClass?.currentPeriod)
        await db.gradePeriods.put(
          snapshot(prevClass, existing, prevClass.currentPeriod),
        );
      const cls: ClassRecord = {
        id: classId,
        name: classId,
        subjects: parsed.subjects,
        importedAt: Date.now(),
        currentPeriod: period,
      };
      const records: StudentRecord[] = [...parsed.students].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")).map(
        (student, order) => ({
          ...student,
          name: nameKey(student.name),
          classId,
          order,
        }),
      );
      if (period) await db.gradePeriods.put(snapshot(cls, records, period));
      const historical = !!(
        period &&
        prevClass?.currentPeriod &&
        periodOrder(period) < periodOrder(prevClass.currentPeriod)
      );
      if (historical)
        return {
          classId,
          studentCount: records.length,
          overwritten: !!exists,
          historical: true,
        };

      const byName = new Map(
        existing.map((student) => [nameKey(student.name), student]),
      );
      const duplicates = new Set(
        existing
          .filter(
            (s, index) =>
              existing.findIndex(
                (other) => nameKey(other.name) === nameKey(s.name),
              ) !== index,
          )
          .map((s) => nameKey(s.name)),
      );
      if (duplicates.size)
        throw new Error(
          "Há nomes repetidos na turma atual. Corrija-os antes de atualizar o mapão.",
        );
      const merged = records.map((student) => ({
        ...byName.get(nameKey(student.name)),
        ...student,
      }));
      const retained = new Set(
        merged.flatMap((student) =>
          student.id === undefined ? [] : [student.id],
        ),
      );
      await db.students.bulkDelete(
        existing.flatMap((student) =>
          student.id !== undefined && !retained.has(student.id)
            ? [student.id]
            : [],
        ),
      );
      await db.students.bulkPut(merged);
      await db.classes.put(cls);
      return {
        classId,
        studentCount: records.length,
        overwritten: !!(period ? exists : prevClass),
        historical: false,
      };
    },
  );
}

export async function syncCurrentPeriod(classId: string) {
  const cls = await db.classes.get(classId);
  if (cls?.currentPeriod) {
    const students = await db.students
      .where("classId")
      .equals(classId)
      .sortBy("order");
    await db.gradePeriods.put(snapshot(cls, students, cls.currentPeriod));
  }
}
