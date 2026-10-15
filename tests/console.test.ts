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
} from "../lib/presentation";
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
