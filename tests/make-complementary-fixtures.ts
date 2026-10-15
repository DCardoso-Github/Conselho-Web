import { mkdir, writeFile } from "node:fs/promises";
import { multiWorkbook, names } from "./fixtures";

async function main() {
await mkdir("artifacts/complementary-fixtures", { recursive: true });
for (const term of [1, 3]) {
  const book = multiWorkbook(["5Z", "6A"].map((name, classIndex) => ({
    name,
    rows: [["Aluno(a)", "Participação", "Acertos", "MAT", "PORT"], ...names.map((student, i) => [
      student, i === 8 ? null : term === 1 ? "80%" : "100%",
      i === 8 ? null : `${Math.min(95, 30 + i * 5 + classIndex * 2 + (term === 3 ? 20 : 0))}%`,
      term === 1 ? "1%" : "35%", term === 1 ? "40%" : "60%",
    ])],
  })));
  await writeFile(`artifacts/complementary-fixtures/Prova Paulista ${term} bimestre 2026.xlsx`, book);
}
await writeFile("artifacts/complementary-fixtures/Frequencia e Tutor.xlsx", multiWorkbook(["5Z", "6A"].map(name => ({
  name,
  rows: [["Aluno(a)", "Frequência anual", "Nome do tutor"], ...names.map((student, i) => [student, `${90 + i}%`, `Tutor fictício ${name}`])],
}))));
}
void main();
