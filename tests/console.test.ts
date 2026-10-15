import "fake-indexeddb/auto";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import { disposeFaceDetector } from "../lib/face";
import { processPhoto, importPhotosFromFiles, importPhotosFromZip } from "../lib/photos";
import JSZip from "jszip";
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
  remainingPresentationStudents,
  percentage,
  displayValue,
  hasLowGrades,
  lowGradeCount,
} from "../lib/presentation";
import { studentHighlights } from "../lib/highlights";
import { studentAverage } from "../lib/highlights";
import { detectMapaoPeriod } from "../lib/mapao/period";
import { workbook, multiWorkbook } from "./fixtures";
import { prepareComplementaryImport, applyComplementaryImport } from "../lib/complementary-import";
import { compareProvaPaulista, numericPercentage } from "../lib/prova-evolution";
import { studentDraft, validateStudentDraft } from "../lib/student-edit";

test("student editor retains support information and validates changed grades across tabs", async () => {
  const original = { ...student(701, "ET"), tutor: "Tutor original", educacaoEspecial: "Apoio registrado", notes: "Anotação existente", outrasInformacoes: "Conselho", tutoriaMatematica: true };
  const draft = studentDraft(original);
  assert.equal(draft.notes, original.notes);
  assert.equal(draft.educacaoEspecial, original.educacaoEspecial);
  assert.equal(draft.tutoriaMatematica, true);
  assert.equal(validateStudentDraft(draft, original), null);
  draft.grades.MATEMATICA = "12";
  assert.match(validateStudentDraft(draft, original)!, /nota de Matemática/);
  draft.grades.MATEMATICA = "7,5";
  draft.absences.MATEMATICA = "-1";
  assert.match(validateStudentDraft(draft, original)!, /faltas de Matemática/);
  draft.absences.MATEMATICA = "2.5";
  assert.match(validateStudentDraft(draft, original)!, /inteiro/);
  draft.absences.MATEMATICA = 0;
  draft.tutor = "Tutor atualizado";
  draft.educacaoEspecial = "Apoios e adaptações atualizados";
  draft.tutoriaPortugues = true;
  assert.equal(validateStudentDraft(draft, original), null);
  await db.students.put(original);
  await updateStudent(original.id!, draft);
  const saved = await db.students.get(original.id!);
  assert.equal(saved!.tutor, draft.tutor);
  assert.equal(saved!.educacaoEspecial, draft.educacaoEspecial);
  assert.equal(saved!.notes, original.notes);
  assert.equal(saved!.name, original.name);
  assert.equal(saved!.tutoriaPortugues, true);
  await db.students.delete(original.id!);
});

test("period suggestions recognize explicit labels and never mistake students or class numbers for terms", () => {
  const buffer = (rows: unknown[][] = []) => new Uint8Array(workbook(rows)).buffer;
  for (const [name, term] of [["7B_2026_3bim.xlsx", 3], ["8A_primeiro_bimestre.xlsx", 1], ["9B_Bimestre-IV.xlsx", 4], ["6A_2º_Bimestre.xlsx", 2]] as const) {
    assert.equal(detectMapaoPeriod(name, buffer()).period.term, term);
  }
  assert.deepEqual(detectMapaoPeriod("7B.xlsx", buffer([["Ano letivo", 2026], ["Bimestre", 2], ["ALUNO", "SITUACAO"], ["3 bimestre", "ATIVO"]])).period, { term: 2, year: 2026 });
  assert.equal(detectMapaoPeriod("7B_1_2026.xlsx", buffer([["ALUNO", "SITUACAO"], ["4 bimestre", "ATIVO"]])).period.term, 1);
  assert.equal(detectMapaoPeriod("1º_ANO_A_2026.xlsx", buffer()).period.term, undefined);
  assert.equal(detectMapaoPeriod("7B.xlsx", buffer([["Bimestre"], [4], ["ALUNO", "SITUACAO"]])).period.term, 4);
  const conflict = detectMapaoPeriod("7B_1bim.xlsx", buffer([["Terceiro bimestre"]]));
  assert.equal(conflict.period.term, undefined);
  assert.match(conflict.message, /diferentes/);
});

test("student average preserves zero and excludes missing or nonnumeric concepts", () => {
  assert.equal(studentAverage({ ...student(1, 0), grades: { A: 0, B: 10, C: "ET", D: null, E: "", F: "7,5" } }), 17.5 / 3);
  assert.equal(studentAverage(student(1, null)), null);
  assert.equal(studentAverage(student(1, 0)), 0);
});

test("imports sort current students and history alphabetically while preserving existing identities", async () => {
  const parsed = parseMapao("6Z.xlsx", new Uint8Array(mapao()).buffer);
  await persistMapao(parsed, { period: { year: 2026, term: 1 } });
  const saved = await db.students.where("classId").equals("6Z").sortBy("order");
  assert.deepEqual(saved.map(s => s.name), [...names].sort((a, b) => a.localeCompare(b, "pt-BR")));
  await db.students.update(saved[0].id!, { tutor: "Tutor preservado" });
  await persistMapao({ ...parsed, students: [...parsed.students].reverse() }, { period: { year: 2026, term: 2 } });
  const updated = await db.students.where("classId").equals("6Z").sortBy("order");
  assert.deepEqual(updated.map(s => s.id), saved.map(s => s.id));
  assert.equal(updated[0].tutor, "Tutor preservado");
  const history = await db.gradePeriods.get(periodId("6Z", { year: 2026, term: 2 }));
  assert.deepEqual(history!.students.map(s => s.name), saved.map(s => s.name));
  await deleteClass("6Z");
});
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

test("highlights select at most six by numeric average without mutating students", () => {
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
    [3, 2, 4, 5, 6, 7],
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
    [3, 2, 4, 5, 6, 7],
  );
  assert.equal(
    presentationStudents(students, "top", "1", ["MATEMATICA"]).length,
    students.length,
  );
});
test("presentation expands in descending score order, keeping the selected prefix and missing data last", () => {
  const students = Array.from({ length: 9 }, (_, i) => ({
    ...student(i + 1, i === 8 ? null : 10 - i),
    name: `ALUNO ${9 - i}`,
  }));
  const originalOrder = students.map(s => s.id);
  const top = presentationStudents(students, "top", null);
  const rest = remainingPresentationStudents(students, top);
  assert.equal(top.length, 6);
  assert.deepEqual(rest.map(s => s.id), [7, 8, 9]);
  assert.deepEqual([...top, ...rest].slice(0, top.length), top);
  assert.equal(new Set([...top, ...rest].map(s => s.id)).size, students.length);
  assert.deepEqual(students.map(s => s.id), originalOrder);
  assert.deepEqual(remainingPresentationStudents(students, students), []);
  assert.equal(remainingPresentationStudents(students, []).length, 9);
  assert.deepEqual(remainingPresentationStudents([], []), []);

  const comparisons = students.slice(0, 8).map((s, i) => ({
    student: s, before: 3, after: 9 - i, gain: 6 - i,
    subjects: [{ subject: "MATEMATICA", before: 3, after: 9 - i, gain: 6 - i }],
  }));
  const leaders = evolutionLeaders(comparisons).map(row => row.student);
  const evolutionRest = remainingPresentationStudents(students, leaders, undefined, comparisons);
  assert.deepEqual(evolutionRest.map(s => s.id), [7, 8, 9]);
  assert.deepEqual([...leaders, ...evolutionRest].slice(0, leaders.length), leaders);
  // Evolution order must follow gains even when current averages rank differently.
  const differentGains = comparisons.map((row, i) => ({ ...row, gain: i - 3 }));
  const differentLeaders = evolutionLeaders(differentGains).map(row => row.student);
  assert.deepEqual([
    ...differentLeaders,
    ...remainingPresentationStudents(students, differentLeaders, undefined, differentGains),
  ].map(s => s.id), [8, 7, 6, 5, 4, 3, 2, 1, 9]);
  assert.equal(comparisons.find(row => row.student.id === 7)?.gain, 0);
  assert.equal(comparisons.find(row => row.student.id === 8)?.gain, -1);
  assert.equal(comparisons.find(row => row.student.id === 9), undefined);
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
import { classOverview, classEvolution, matchesSearch } from "../lib/class-analytics";
import { analyticsPanels, analyticsPresentationHref } from "../lib/analytics-presentation";

test("presentation batches include every discipline exactly once with stable navigation", () => {
  for (const view of ["overview", "evolution"] as const) {
    for (const count of [0, 1, 8, 18, 27]) {
      const panels = analyticsPanels(view, count);
      const batches = panels.filter((panel) => panel.kind === "subjects");
      const indices = batches.flatMap((panel) => Array.from({ length: panel.end! - panel.start! }, (_, index) => panel.start! + index));
      assert.deepEqual(indices, Array.from({ length: count }, (_, index) => index));
      assert.ok(batches.every((panel) => panel.end! - panel.start! <= (view === "overview" ? 3 : 2)));
      assert.equal(panels[0].kind, view === "overview" ? "summary" : "mean");
      assert.ok(panels.length >= (view === "overview" ? 2 : 3));
    }
  }
});

test("presentation links preserve the exact chosen period identifiers", () => {
  const before = JSON.stringify(["7 B", 2026, 1]);
  const after = JSON.stringify(["7 B", 2026, 3]);
  const url = new URL(analyticsPresentationHref("7 B", "evolution", before, after), "https://example.test");
  assert.equal(url.pathname, "/turmas/7%20B/apresentar-paineis");
  assert.equal(url.searchParams.get("before"), before);
  assert.equal(url.searchParams.get("after"), after);
  assert.equal(url.searchParams.get("view"), "evolution");
  assert.equal(new URL(analyticsPresentationHref("6A", "overview"), url).searchParams.has("before"), false);
});

test("overview keeps missing and nonnumeric values out of means and coverage", () => {
  const rows = [student(1, 0), student(2, "4,5"), student(3, "ET"), student(4, null)];
  const result = classOverview(rows, ["MATEMATICA", "MATEMATICA", "PORTUGUES"]);
  assert.equal(result.count, 2);
  assert.equal(result.expected, 8);
  assert.equal(result.average, 2.25);
  assert.equal(result.withoutGrades, 2);
  assert.equal(result.withLow, 1);
  assert.deepEqual(result.bands, [1, 1, 0]);
  assert.equal(result.rows[0].lowPercent, 50);
  assert.equal(result.rows[1].average, null);
  assert.equal(result.rows[1].lowPercent, null);
  assert.equal(classOverview([], ["MATEMATICA"]).average, null);
});

test("class evolution weights students equally and reports only matched low grades", () => {
  const data = classEvolution([
    { student: student(1, 5), before: 2, after: 6, gain: 4, subjects: [{ subject: "MAT", before: 2, after: 6, gain: 4 }] },
    { student: student(2, 5), before: 5, after: 4, gain: -1, subjects: [{ subject: "MAT", before: 6, after: 4, gain: -2 }, { subject: "PORT", before: 4, after: 4, gain: 0 }] },
  ]);
  assert.equal(data.before, 3.5);
  assert.equal(data.after, 5);
  assert.equal(data.gain, 1.5);
  assert.equal(data.pairCount, 3);
  assert.equal(data.lowBefore, 2);
  assert.equal(data.lowAfter, 2);
  assert.equal(data.improved, 1);
  assert.equal(data.declined, 1);
  assert.equal(data.subjects[0].count, 2);
  assert.equal(data.subjects[0].gain, 1);
  assert.equal(classEvolution([]).gain, null);
});

test("search ignores accents and matches all terms without a pre-filter limit", () => {
  const names = Array.from({ length: 250 }, (_, i) => `Aluno ${i}`);
  names.push("JOÃO DA SILVA 8A");
  assert.deepEqual(names.filter((name) => matchesSearch(name, "8a joao")), ["JOÃO DA SILVA 8A"]);
  assert.equal(matchesSearch("Evolução da turma", "evolucao"), true);
  assert.equal(matchesSearch("JOAO 8A", "JOAO 8B"), false);
});
import { identifyCurrentPeriod, persistMapao } from "../lib/grade-history";
import { deleteClass, deleteStudent, deleteStudents } from "../lib/actions";
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

test("evolution leaders select six positive gains and break ties by coverage then name", () => {
  const students = Array.from({ length: 9 }, (_, index) => student(index + 1, 5));
  const previous = periodRecord(1, students.map((s) => ({ ...s, grades: { MATEMATICA: 2, PORTUGUES: s.id === 2 ? null : 2 } })));
  const next = periodRecord(2, students.map((s) => ({ ...s, grades: { MATEMATICA: s.id! < 7 ? 5 : 1, PORTUGUES: s.id! < 7 ? 5 : 1 } })));
  const rows = comparePeriods(students, previous, next);
  assert.deepEqual(evolutionLeaders(rows).map((row) => row.student.id), [1, 3, 4, 5, 6, 2]);
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

test("deleting students and classes is scoped and updates the active period atomically", async (t) => {
  const cls = { id: "EXCLUSAO", name: "EXCLUSAO", importedAt: 0, subjects: ["MATEMATICA"], currentPeriod: { year: 2026, term: 2 } };
  await db.classes.put(cls);
  const first = { ...student(9101, 8), classId: cls.id, photo: new Blob(["photo"]), notes: "nota privada" };
  const second = { ...student(9102, 6), classId: cls.id };
  const outsider = { ...student(9103, 7), classId: "OUTRA" };
  await db.students.bulkPut([first, second, outsider]);
  const oldPeriod = { ...periodRecord(1, [first, second]), id: periodId(cls.id, { year: 2026, term: 1 }), classId: cls.id };
  const activePeriod = { ...oldPeriod, id: periodId(cls.id, cls.currentPeriod), term: 2 };
  await db.gradePeriods.bulkPut([oldPeriod, activePeriod]);
  await assert.rejects(deleteStudent("OUTRA", 9101), /nesta turma/);
  assert.ok(await db.students.get(9101));
  // A storage failure must roll back the deletion, including the photo and notes.
  const put = t.mock.method(db.gradePeriods, "put", async () => { throw new Error("storage failure"); });
  await assert.rejects(deleteStudent(cls.id, 9101), /storage failure/);
  assert.equal((await db.students.get(9101))?.notes, first.notes);
  put.mock.restore();
  await deleteStudent(cls.id, 9101);
  assert.equal(await db.students.get(9101), undefined);
  assert.deepEqual((await db.gradePeriods.get(activePeriod.id))?.students.map(s => s.name), [second.name]);
  assert.equal((await db.gradePeriods.get(oldPeriod.id))?.students.length, 2);
  assert.ok(await db.students.get(9103));
  await deleteStudent(cls.id, 9102);
  assert.equal((await db.gradePeriods.get(activePeriod.id))?.students.length, 0);
  assert.ok(await db.classes.get(cls.id), "deleting the last student keeps an empty class");
  await deleteClass(cls.id);
  assert.equal(await db.classes.get(cls.id), undefined);
  assert.equal(await db.gradePeriods.where("classId").equals(cls.id).count(), 0);
  assert.ok(await db.students.get(9103));
  await db.students.delete(9103);
});

test("bulk deletion validates every selected student before deleting and rolls back on failure", async (t) => {
  const cls = { id: "LOTE", name: "LOTE", importedAt: 0, subjects: ["MATEMATICA"], currentPeriod: { year: 2026, term: 2 } };
  await db.classes.put(cls);
  const members = [9201, 9202, 9203].map(id => ({ ...student(id, 7), classId: cls.id }));
  await db.students.bulkPut([...members, { ...student(9204, 8), classId: "OUTRA" }]);
  const old = { ...periodRecord(1, members), id: periodId(cls.id, { year: 2026, term: 1 }), classId: cls.id };
  await db.gradePeriods.put(old);
  await assert.rejects(deleteStudents(cls.id, []), /Selecione/);
  await assert.rejects(deleteStudents(cls.id, [9201, 9204]), /nesta turma/);
  await assert.rejects(deleteStudents(cls.id, [9201, 99999]), /nesta turma/);
  assert.equal(await db.students.where("classId").equals(cls.id).count(), 3);
  const put = t.mock.method(db.gradePeriods, "put", async () => { throw new Error("storage failure"); });
  await assert.rejects(deleteStudents(cls.id, [9201, 9202]), /storage failure/);
  assert.equal(await db.students.where("classId").equals(cls.id).count(), 3);
  put.mock.restore();
  await deleteStudents(cls.id, [9201, 9202, 9201]);
  assert.deepEqual((await db.students.where("classId").equals(cls.id).toArray()).map(s => s.id), [9203]);
  assert.deepEqual((await db.gradePeriods.get(periodId(cls.id, cls.currentPeriod)))?.students.map(s => s.name), [members[2].name]);
  assert.equal((await db.gradePeriods.get(old.id))?.students.length, 3);
  assert.ok(await db.students.get(9204));
  await deleteClass(cls.id);
  await db.students.delete(9204);
});

test("photo imports crop around the face, fall back safely and preserve student data", async (t) => {
  const originals = new Map(["createImageBitmap", "OffscreenCanvas", "document"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const draws: unknown[][] = [];
  let closed = 0;
  let hasFace = true;
  let unavailable = false;
  const bitmap = { width: 1600, height: 2400, close: () => { closed++; } };
  const jpeg = new Blob(["cropped jpeg"], { type: "image/jpeg" });
  Object.defineProperty(globalThis, "createImageBitmap", { configurable: true, value: async () => bitmap });
  Object.defineProperty(globalThis, "OffscreenCanvas", { configurable: true, value: undefined });
  Object.defineProperty(globalThis, "document", { configurable: true, value: {
    createElement: () => ({ width: 0, height: 0,
      getContext: () => ({ fillStyle: "", fillRect() {}, drawImage: (...args: unknown[]) => draws.push(args) }),
      toBlob(callback: (blob: Blob) => void, type: string) { assert.equal(type, "image/jpeg"); assert.equal(this.width, 600); assert.equal(this.height, 600); callback(jpeg); },
    }),
  } });
  t.after(() => {
    disposeFaceDetector();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  t.mock.method(FilesetResolver, "forVisionTasks", async () => {
    if (unavailable) throw new Error("offline");
    return {};
  });
  t.mock.method(FaceDetector, "createFromOptions", async () => ({
    detect: () => ({ detections: hasFace ? [{ boundingBox: { originX: 1000, originY: 300, width: 200, height: 200 } }] : [] }),
    close() {},
  }));
  const input = new File(["source"], "ALUNO FOTO.jpg", { type: "image/jpeg" });
  assert.equal(await processPhoto(input), jpeg);
  // The detected face is off-center: the crop must follow it, not the whole photo.
  assert.deepEqual(draws.at(-1)?.slice(1), [730, 160, 740, 740, 0, 0, 600, 600]);
  hasFace = false;
  await processPhoto(input);
  assert.deepEqual(draws.at(-1)?.slice(1), [0, -150, 600, 900]);
  disposeFaceDetector();
  unavailable = true;
  await processPhoto(input);
  assert.deepEqual(draws.at(-1)?.slice(1), [0, -150, 600, 900]);
  unavailable = false;
  hasFace = true;
  await processPhoto(input);
  assert.equal(draws.at(-1)?.length, 9, "detector retries after a failed initialization");
  assert.equal(closed, 4, "all image bitmaps are released");

  const id = await db.students.add({ ...student(9001, 8), classId: "FOTO", name: "ALUNO FOTO" });
  const before = await db.students.get(id);
  assert.equal((await importPhotosFromFiles("FOTO", [input])).matched, 1);
  const zip = new JSZip();
  zip.file("fotos/1. ALUNO FOTO.jpg", "source");
  const archive = await zip.generateAsync({ type: "uint8array" });
  assert.equal((await importPhotosFromZip("FOTO", archive as unknown as Blob)).matched, 1);
  const saved = await db.students.get(id);
  assert.equal(saved?.photo?.type, "image/jpeg");
  assert.deepEqual(saved?.grades, before?.grades);
  assert.equal(saved?.name, before?.name);
  assert.equal(draws.at(-1)?.length, 9, "ZIP imports also use the face crop");
  await db.students.delete(id);
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

test("multi-sheet imports route names within each class, review unknown tabs, and preserve absent columns", async () => {
  for (const classId of ["5X", "5Y"]) {
    await db.classes.put({ id: classId, name: classId, importedAt: 0, subjects: ["MATEMATICA"], currentPeriod: { year: 2026, term: 3 } });
    await db.students.add({ ...student(classId === "5X" ? 801 : 802, 7), classId, name: "ANA SILVA", tutor: "Tutor original", frequenciaAnual: 80 });
  }
  const input = file(multiWorkbook([
    { name: "5X", rows: [["NOME DO ALUNO", "FREQUÊNCIA ANUAL"], ["Ana Silva", "90%"]] },
    { name: "5º ano Y", rows: [["ALUNO", "NOME DO TUTOR"], ["ÁNA SILVA", "Tutor Y"], ["Sem cadastro", "Tutor Y"]] },
    { name: "9Z", rows: [["ALUNO", "TUTOR"], ["Ana Silva", "Não importar"]] },
    { name: "Instruções", rows: [["Como utilizar este documento"]] },
    { name: "Oculta", hidden: true, rows: [["ALUNO", "TUTOR"], ["Ana Silva", "Oculto"]] },
  ]), "frequencia-multiturmas.xlsx");
  const preview = await prepareComplementaryImport("5X", input, "attendance");
  assert.deepEqual(preview.sheets.map(s => s.suggestedClassId), ["5X", "5Y", "", "", ""]);
  assert.ok(preview.sheets[3].error);
  const result = await applyComplementaryImport(preview, [{ index: 0, classId: "5X" }, { index: 1, classId: "5Y" }]);
  assert.equal(result.matched, 2);
  assert.deepEqual(result.unmatched, ["5Y · SEM CADASTRO"]);
  const x = (await db.students.get(801))!, y = (await db.students.get(802))!;
  assert.equal(x.frequenciaAnual, "90%"); assert.equal(x.tutor, "Tutor original");
  assert.equal(y.frequenciaAnual, 80); assert.equal(y.tutor, "Tutor Y");
  await assert.rejects(() => applyComplementaryImport(preview, [{ index: 0, classId: "5X" }, { index: 1, classId: "5X" }]), /uma aba por turma/);
  await assert.rejects(() => importFrequenciaTutor("5X", input), /revisão/);
});

test("Prova Paulista keeps period history, percentages, and latest display during out-of-order imports", async () => {
  const ppFile = (acertos: unknown, part: unknown) => file(multiWorkbook([
    { name: "5X", rows: [["ALUNO", "ACERTOS", "PARTICIPAÇÃO", "MAT"], ["Ana Silva", acertos, part, 0.01]], percentages: ["D2"] },
    { name: "5Y", rows: [["ALUNO", "ACERTOS", "PARTICIPAÇÃO"], ["Ana Silva", "10%", "0%"]] },
  ]), "PP_3_bimestre_2026.xlsx");
  const preview = await prepareComplementaryImport("5X", ppFile("60%", "100%"), "pp");
  assert.deepEqual(preview.suggestedPeriod, { year: 2026, term: 3 });
  assert.equal((await importProvaPaulista("5X", ppFile("60%", "100%"), { year: 2026, term: 3 })).matched, 2);
  await importProvaPaulista("5X", ppFile(0.4, "80%"), { year: 2026, term: 1 });
  let saved = (await db.students.get(801))!;
  assert.equal(saved.provaPaulista?.acertos, "60%");
  assert.deepEqual(saved.provaPaulistaPeriod, { year: 2026, term: 3 });
  const comparison = compareProvaPaulista(saved, { year: 2026, term: 1 }, { year: 2026, term: 3 })!;
  assert.equal(comparison.hasBothPeriods, true);
  assert.equal(comparison.acertos?.gain, 20);
  assert.equal(comparison.participacao?.gain, 20);
  assert.equal(comparison.subjects[0].before, 1);
  const partial = file(multiWorkbook([{ name: "5X", rows: [["ALUNO", "ACERTOS"], ["Ana Silva", "70%"]] }]), "partial.xlsx");
  await importProvaPaulista("5X", partial, { year: 2026, term: 3 });
  saved = (await db.students.get(801))!;
  assert.equal(saved.provaPaulista?.acertos, "70%");
  assert.equal(saved.provaPaulista?.participacao, "100%");
  assert.equal(saved.provaPaulista?.grades.MAT, "1%");
  assert.equal(compareProvaPaulista(saved, { year: 2026, term: 1 }, { year: 2026, term: 3 })!.acertos?.gain, 30);
});

test("supplementary imports are atomic and reject duplicate student names and wrong years", async () => {
  const input = file(multiWorkbook([
    { name: "5X", rows: [["ALUNO", "TUTOR"], ["Ana Silva", "Deve reverter"]] },
    { name: "5Y", rows: [["ALUNO", "TUTOR"], ["Ana Silva", "Duplicado"]] },
  ]), "atomic.xlsx");
  const preview = await prepareComplementaryImport("5X", input, "attendance");
  const id = await db.students.add({ ...student(803, 7), classId: "5Y", name: "ANA SILVA" });
  await assert.rejects(() => applyComplementaryImport(preview, [{ index: 0, classId: "5X" }, { index: 1, classId: "5Y" }]), /nomes repetidos/);
  assert.equal((await db.students.get(801))!.tutor, "Tutor original");
  await db.students.delete(id);
  const duplicate = await prepareComplementaryImport("5X", file(multiWorkbook([{ name: "5X", rows: [["ALUNO", "ACERTOS"], ["Ana Silva", 50], ["Ána Silva", 70]] }]), "duplicate.xlsx"), "pp");
  assert.match(duplicate.sheets[0].error!, /nomes repetidos/);
  await assert.rejects(() => applyComplementaryImport(duplicate, [{ index: 0, classId: "5X" }], { year: 2026, term: 3 }), /Confira/);
  const pp = await prepareComplementaryImport("5X", file(workbook([["ALUNO", "ACERTOS"], ["Ana Silva", 80]]), "pp.xlsx"), "pp");
  await assert.rejects(() => applyComplementaryImport(pp, [{ index: 0, classId: "5X" }], { year: 2027, term: 3 }), /ano 2026/);
  assert.equal((await db.students.get(801))!.provaPaulista?.acertos, "70%");
});

test("Prova Paulista comparison never fabricates missing history and does not change grade ranking", () => {
  for (const [value, expected] of [[0, 0], [1, 100], ["1%", 1], ["0,92", 92], ["95%", 95], ["", null], [null, null], ["ET", null], [-1, null], [101, null]] as const) assert.equal(numericPercentage(value), expected);
  const current = [student(901, 7), student(902, 8)];
  const before = periodRecord(1, current.map(s => ({ ...s, grades: { MATEMATICA: 5 } })));
  const after = periodRecord(3, current);
  const baseline = evolutionLeaders(comparePeriods(current, before, after)).map(r => r.student.id);
  const withPP = current.map((s, i) => ({ ...s, provaPaulistaHistory: {
    [periodId(s.classId, before)]: { participacao: "50%", acertos: i ? "100%" : "0%", grades: { MAT: "1%", PORT: null } },
    [periodId(s.classId, after)]: { participacao: null, acertos: i ? "0%" : "100%", grades: { MAT: "0%", PORT: "90%" } },
  } }));
  assert.deepEqual(evolutionLeaders(comparePeriods(withPP, before, after)).map(r => r.student.id), baseline);
  const compared = compareProvaPaulista(withPP[0], before, after)!;
  assert.equal(compared.acertos?.gain, 100);
  assert.equal(compared.participacao, null);
  assert.equal(compared.subjects.find(s => s.subject === "PORT")!.change, null);
  assert.equal(compared.subjects.find(s => s.subject === "MAT")!.change!.gain, -1);
  assert.equal(compareProvaPaulista({ ...current[0], provaPaulista: { participacao: 1, acertos: 1, grades: {} } }, before, after)!.hasBothPeriods, false);
  assert.equal(compareProvaPaulista(withPP[0], after, before), undefined);
  assert.equal(compareProvaPaulista(withPP[0], before, { ...after, year: 2027 }), undefined);
});

test("Prova Paulista history survives mapao replacement and student edits", async () => {
  const original = (await db.students.get(801))!;
  const previousHistory = original.provaPaulistaHistory;
  await updateStudent(original.id!, { notes: "Observação preservada" });
  await persistMapao({ className: "5X", subjects: ["MATEMATICA"], students: [{ ...original, grades: { MATEMATICA: 8 } }] }, { period: { year: 2026, term: 3 }, replace: true });
  const saved = (await db.students.where("classId").equals("5X").toArray())[0];
  assert.deepEqual(saved.provaPaulistaHistory, previousHistory);
  assert.equal(saved.notes, "Observação preservada");
  assert.equal(saved.provaPaulista?.acertos, "70%");
});
