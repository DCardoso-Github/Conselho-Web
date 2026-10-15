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
