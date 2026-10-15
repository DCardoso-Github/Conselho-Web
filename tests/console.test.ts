import "fake-indexeddb/auto";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, unlink } from "node:fs/promises";
import { db, type StudentRecord } from "../lib/db";
import {
  importMapaoFile,
  importProvaPaulista,
  importFrequenciaTutor,
  updateStudent,
} from "../lib/actions";
import {
  presentationStudents,
  percentage,
  displayValue,
  hasLowGrades,
  lowGradeCount,
} from "../lib/presentation";
import { studentHighlights } from "../lib/highlights";
import { exportClassToXlsx } from "../lib/mapao/exporter";
import { parseMapao } from "../lib/mapao/parser";
import { mapao, prova, frequencia, names } from "./fixtures";
const file = (buffer: Buffer, name: string) =>
  new File([new Uint8Array(buffer)], name);
function student(id: number, grade: unknown): StudentRecord {
  return {
    id,
    classId: "TESTE",
    name: `ALUNO ${id}`,
    order: id,
    situation: "ATIVO",
    total: {},
    absences: {},
    grades: { MATEMATICA: grade as number | null },
  };
}
test("presentation selection preserves legacy links and explicit scopes", () => {
  const students = [
    student(1, 3),
    student(2, 8),
    student(3, null),
    student(4, 4),
  ];
  assert.deepEqual(
    presentationStudents(students, null, null).map((s) => s.id),
    [1, 4],
  );
  assert.equal(presentationStudents(students, "all", null).length, 4);
  assert.deepEqual(
    presentationStudents(students, "low", null).map((s) => s.id),
    [1, 4],
  );
  assert.equal(presentationStudents(students, "low", "2").length, 4);
  assert.equal(presentationStudents(students, null, "3").length, 4);
  assert.equal(presentationStudents(students, "low", "999").length, 2);
  assert.equal(presentationStudents([student(1, 8)], null, null).length, 1);
  assert.equal(presentationStudents([student(1, 8)], "low", null).length, 0);
  assert.deepEqual(presentationStudents([], "all", "1"), []);
});
test("missing values are neutral while zero remains real data", () => {
  for (const value of [null, undefined, "", " ", "-", "S/N"]) {
    assert.equal(displayValue(value), "Sem informação");
    assert.equal(percentage(value), "Sem informação");
    assert.equal(hasLowGrades(student(1, value)), false);
  }
  const mixed = {
    ...student(1, 0),
    grades: {
      ZERO: 0,
      LOW: 4,
      PASS: 5,
      EMPTY: null,
      TEXT: "ET",
      ABSENT: "S/N",
    },
  };
  assert.equal(lowGradeCount(mixed), 2);
  assert.equal(lowGradeCount(mixed, ["PASS", "EMPTY", "TEXT", "ABSENT"]), 0);
  assert.equal(displayValue(0), "0");
  assert.equal(percentage(0), "0%");
  assert.equal(hasLowGrades(student(1, 0)), true);
  assert.equal(percentage("0,92"), "92%");
  assert.equal(percentage("92%"), "92%");
  assert.equal(percentage("1%"), "1%");
  assert.equal(percentage(1), "100%");
});
test("import, edit, reimport and XLSX export retain local student data", async () => {
  const imported = await importMapaoFile(file(mapao(), "MAPAO_6º_ANO_A.xlsx"));
  assert.equal(imported.studentCount, 9);
  assert.equal(imported.classId, "6A");
  const students = await db.students
    .where("classId")
    .equals("6A")
    .sortBy("order");
  assert.equal(students[0].name, names[0]);
  assert.equal(
    (await importProvaPaulista("6A", file(prova(), "prova.xlsx"))).matched,
    1,
  );
  assert.equal(
    (await importFrequenciaTutor("6A", file(frequencia(), "frequencia.xlsx")))
      .matched,
    2,
  );
  const original = (await db.students.get(students[0].id!))!;
  await updateStudent(original.id!, {
    grades: { ...original.grades, MATEMATICA: "4" },
    outrasInformacoes: "OBSERVAÇÃO FICTÍCIA",
    tutoriaMatematica: true,
    photo: new Blob(["photo"], { type: "image/png" }),
    notes: "ANOTAÇÃO FICTÍCIA",
  });
  const edited = (await db.students.get(original.id!))!;
  assert.equal(edited.provaPaulista?.acertos, 0.65);
  assert.equal(edited.frequenciaAnual, 0.92);
  assert.equal(edited.grades.MATEMATICA, "4");
  await exportClassToXlsx("6A");
  const exported = await readFile("6A.xlsx");
  const parsed = parseMapao(
    "6A.xlsx",
    exported.buffer.slice(
      exported.byteOffset,
      exported.byteOffset + exported.byteLength,
    ),
  );
  assert.equal(parsed.students.length, 9);
  assert.equal(parsed.students[0].grades.MATEMATICA, 4);
  await unlink("6A.xlsx");
  await importMapaoFile(file(mapao(), "MAPAO_6º_ANO_A.xlsx"));
  const reimported = (
    await db.students.where("classId").equals("6A").sortBy("order")
  )[0];
  assert.ok(reimported.photo);
  assert.equal(reimported.notes, "ANOTAÇÃO FICTÍCIA");
  assert.equal(reimported.outrasInformacoes, "OBSERVAÇÃO FICTÍCIA");
  assert.equal(reimported.provaPaulista?.acertos, 0.65);
  assert.equal(reimported.tutoriaMatematica, true);
});
after(async () => {
  await db.delete();
});

test("highlights select at most five by numeric average without mutating students", () => {
  const students = [
    student(1, null),
    student(2, "9,5"),
    student(3, 10),
    student(4, 8),
    student(5, 7),
    student(6, 6),
    student(7, 0),
    student(8, "ET"),
  ];
  const selected = studentHighlights(students, ["MATEMATICA", "PORTUGUES"]);
  assert.deepEqual(
    selected.map(({ student }) => student.id),
    [3, 2, 4, 5, 6],
  );
  assert.equal(selected[1].average, 9.5);
  assert.equal(selected[1].gradeCount, 1);
  assert.equal(selected[1].subjectCount, 2);
  assert.deepEqual(
    students.map((s) => s.id),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
  assert.equal(studentHighlights([student(1, 0)])[0].average, 0);
  assert.deepEqual(
    studentHighlights([
      student(1, null),
      student(2, "ET"),
      student(3, ""),
      student(4, Infinity),
      student(5, 11),
      student(6, -1),
    ]),
    [],
  );
  assert.deepEqual(
    presentationStudents(students, "top", null, ["MATEMATICA"]).map(
      (s) => s.id,
    ),
    [3, 2, 4, 5, 6],
  );
  assert.equal(
    presentationStudents(students, "top", "1", ["MATEMATICA"]).length,
    students.length,
  );
});
test("highlight ties use fewer low grades then alphabetical names", () => {
  const a = {
    ...student(1, 4),
    name: "ANA",
    grades: { MATEMATICA: 4, PORTUGUES: 10 },
  };
  const b = {
    ...student(2, 7),
    name: "ZELIA",
    grades: { MATEMATICA: 7, PORTUGUES: 7 },
  };
  const c = {
    ...student(3, 7),
    name: "BEATRIZ",
    grades: { MATEMATICA: 7, PORTUGUES: 7, OLD: 10 },
  };
  assert.deepEqual(
    studentHighlights([a, b, c], ["MATEMATICA", "PORTUGUES"]).map(
      (x) => x.student.id,
    ),
    [3, 2, 1],
  );
});

import Dexie from "dexie";
import { ConselhoDB, type GradePeriodRecord } from "../lib/db";
import { comparePeriods, evolutionLeaders, periodId } from "../lib/evolution";
import { identifyCurrentPeriod, persistMapao } from "../lib/grade-history";
import { deleteClass } from "../lib/actions";
import { exportGradePeriod } from "../lib/mapao/exporter";
import { evolutionMapao } from "./fixtures";

function periodRecord(term: number, rows: StudentRecord[], year = 2026): GradePeriodRecord {
  return { id: periodId("TESTE", { year, term }), classId: "TESTE", year, term, importedAt: 0, subjects: ["MATEMATICA", "PORTUGUES"], students: rows };
}

test("evolution compares only shared numeric subjects, retaining zero and excluding ambiguous names", () => {
  const current = [student(1, 10), student(2, 7), student(3, 7), student(4, 8)];
  const before = periodRecord(1, [
    { ...current[0], name: "ÁLUNO  1", grades: { MATEMATICA: 0, PORTUGUES: null } },
    { ...current[1], grades: { MATEMATICA: "4,5", PORTUGUES: 6 } },
    { ...current[2], grades: { MATEMATICA: "ET" } },
    current[3], { ...current[3] },
  ]);
  const after = periodRecord(3, [
    { ...current[0], grades: { MATEMATICA: 5, PORTUGUES: 10, NEW: 10 } },
    { ...current[1], grades: { MATEMATICA: 7, PORTUGUES: 5, NEW: 10 } },
    current[2], current[3],
  ]);
  after.subjects.push("NEW");
  const rows = comparePeriods(current, before, after);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].gain, 5);
  assert.equal(rows[0].subjects.length, 1);
  assert.equal(rows[1].gain, 0.75);
  assert.equal(rows[1].before, 5.25);
  assert.equal(rows[1].after, 6);
  assert.deepEqual(comparePeriods(current, after, before), []);
  assert.deepEqual(comparePeriods(current, before, { ...after, year: 2027 }), []);
  assert.deepEqual(comparePeriods(current, before, { ...after, classId: "OUTRA" }), []);
  assert.deepEqual(comparePeriods(current, before, before), []);
  assert.deepEqual(comparePeriods(current, undefined, after), []);
});

test("evolution leaders select five positive gains and break ties by coverage then name", () => {
  const students = Array.from({ length: 9 }, (_, index) => student(index + 1, 5));
  const previous = periodRecord(1, students.map((s) => ({ ...s, grades: { MATEMATICA: 2, PORTUGUES: s.id === 2 ? null : 2 } })));
  const next = periodRecord(2, students.map((s) => ({ ...s, grades: { MATEMATICA: s.id! < 7 ? 5 : 1, PORTUGUES: s.id! < 7 ? 5 : 1 } })));
  const rows = comparePeriods(students, previous, next);
  assert.deepEqual(evolutionLeaders(rows).map((row) => row.student.id), [1, 3, 4, 5, 6]);
  assert.equal(rows.length, 9);
  assert.equal(evolutionLeaders(rows.filter((row) => row.student.id === 1)).length, 1);
  assert.equal(evolutionLeaders(rows.map((row) => ({ ...row, gain: 0 }))).length, 0);
});

test("v1 database upgrade preserves students, photos and notes without guessing a period", async () => {
  const old = new Dexie("migration-test");
  old.version(1).stores({ classes: "id, name, importedAt", students: "++id, classId, name, [classId+name], [classId+order]", meta: "key" });
  await old.table("classes").put({ id: "TESTE", name: "TESTE", importedAt: 1, subjects: ["MATEMATICA"] });
  await old.table("students").put({ ...student(55, 0), notes: "Preservar", photo: new Blob(["foto"]) });
  old.close();
  const upgraded = new ConselhoDB("migration-test");
  await upgraded.open();
  assert.equal(upgraded.verno, 2);
  assert.equal((await upgraded.students.get(55))?.notes, "Preservar");
  assert.equal(await (await upgraded.students.get(55))?.photo?.text(), "foto");
  assert.equal((await upgraded.classes.get("TESTE"))?.currentPeriod, undefined);
  assert.equal(await upgraded.gradePeriods.count(), 0);
  await upgraded.delete();
});

test("period imports preserve current data, synchronize edits and require explicit replacement", async () => {
  await importMapaoFile(file(evolutionMapao(3), "7B.xlsx"));
  const first = (await db.students.where("classId").equals("7B").sortBy("order"))[0];
  await updateStudent(first.id!, { photo: new Blob(["foto"]), notes: "preservar", tutor: "TUTOR", provaPaulista: { grades: {}, participacao: 90, acertos: 80 } });
  await assert.rejects(importMapaoFile(file(evolutionMapao(1), "7B.xlsx"), { period: { year: 2026, term: 1 } }), /identifique/);
  assert.equal(await db.gradePeriods.where("classId").equals("7B").count(), 0);
  await identifyCurrentPeriod("7B", { year: 2026, term: 3 });
  const result = await importMapaoFile(file(evolutionMapao(1), "7B.xlsx"), { period: { year: 2026, term: 1 }, expectedClassId: "7B" });
  assert.equal(result.historical, true);
  let current = (await db.students.get(first.id!))!;
  assert.equal(current.grades.MATEMATICA, 7);
  assert.equal(current.notes, "preservar");
  assert.equal(await current.photo?.text(), "foto");
  const oldId = periodId("7B", { year: 2026, term: 1 });
  const activeId = periodId("7B", { year: 2026, term: 3 });
  let periods = await db.gradePeriods.where("classId").equals("7B").toArray();
  const students = await db.students.where("classId").equals("7B").sortBy("order");
  const comparisons = comparePeriods(students, periods.find((p) => p.id === oldId), periods.find((p) => p.id === activeId));
  assert.deepEqual(evolutionLeaders(comparisons).map((row) => row.gain), [6, 5, 4, 3, 2]);
  assert.equal(comparisons.length, 8);
  await assert.rejects(importMapaoFile(file(evolutionMapao(1), "7B.xlsx"), { period: { year: 2026, term: 1 } }), /já está salvo/);
  await assert.rejects(importMapaoFile(file(evolutionMapao(1), "7B.xlsx"), { period: { year: 2027, term: 1 } }), /mesmo ano/);
  await assert.rejects(importMapaoFile(file(evolutionMapao(1), "7B.xlsx"), { period: { year: 2026, term: 0 } }), /bimestre de 1 a 4/);
  await assert.rejects(importMapaoFile(file(evolutionMapao(1), "8A.xlsx"), { period: { year: 2026, term: 1 }, expectedClassId: "7B" }), /arquivo é da turma/);
  await updateStudent(first.id!, { grades: { ...current.grades, MATEMATICA: 9 } });
  assert.equal((await db.gradePeriods.get(activeId))!.students[0].grades.MATEMATICA, 9);
  assert.equal((await db.gradePeriods.get(oldId))!.students[0].grades.MATEMATICA, 1);
  await importMapaoFile(file(evolutionMapao(1), "7B.xlsx"), { period: { year: 2026, term: 2 } });
  await importMapaoFile(file(evolutionMapao(3), "7B.xlsx"), { period: { year: 2026, term: 4 } });
  current = (await db.students.get(first.id!))!;
  assert.equal(current.notes, "preservar");
  assert.equal(current.provaPaulista?.acertos, 80);
  assert.equal(current.tutor, "TUTOR");
  assert.equal((await db.gradePeriods.get(activeId))!.students[0].grades.MATEMATICA, 9);
  assert.deepEqual((await db.classes.get("7B"))?.currentPeriod, { year: 2026, term: 4 });
  await importMapaoFile(file(evolutionMapao(3), "7B.xlsx"), { period: { year: 2026, term: 2 }, replace: true });
  periods = await db.gradePeriods.where("classId").equals("7B").toArray();
  assert.equal(periods.length, 4);
  assert.equal((await db.gradePeriods.get(oldId))!.students[0].grades.MATEMATICA, 1);
  await exportGradePeriod(oldId);
  const exported = await readFile("7B_2026_1bim.xlsx");
  const parsed = parseMapao("7B_2026_1bim.xlsx", exported.buffer.slice(exported.byteOffset, exported.byteOffset + exported.byteLength));
  assert.equal(parsed.students[0].grades.MATEMATICA, 1);
  await unlink("7B_2026_1bim.xlsx");
  await deleteClass("7B");
  assert.equal(await db.gradePeriods.where("classId").equals("7B").count(), 0);
  assert.equal(await db.students.where("classId").equals("7B").count(), 0);
});

test("new imports label periods and reject empty or duplicate mapoes atomically", async () => {
  await importMapaoFile(file(evolutionMapao(1), "8B.xlsx"), { period: { year: 2026, term: 1 } });
  const old = await db.classes.get("8B");
  const buffer = evolutionMapao(3);
  const parsed = parseMapao("8B.xlsx", buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  await assert.rejects(persistMapao({ ...parsed, students: [] }, { period: { year: 2026, term: 2 } }), /Nenhum aluno/);
  await assert.rejects(persistMapao({ ...parsed, students: [...parsed.students, parsed.students[0]] }, { period: { year: 2026, term: 2 } }), /nomes de alunos repetidos/);
  assert.deepEqual(await db.classes.get("8B"), old);
  assert.equal(await db.gradePeriods.where("classId").equals("8B").count(), 1);
});
