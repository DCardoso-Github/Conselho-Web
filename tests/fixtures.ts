import * as XLSX from "xlsx";
export function multiWorkbook(sheets: { name: string; rows: unknown[][]; hidden?: boolean; percentages?: string[] }[]) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(sheet => {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
    sheet.percentages?.forEach(address => { ws[address].z = "0%"; });
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });
  wb.Workbook = { Sheets: sheets.map(sheet => ({ name: sheet.name, Hidden: sheet.hidden ? 1 : 0 })) };
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
export const subjects = [
  "MATEMATICA",
  "LINGUA PORTUGUESA",
  "CIENCIAS",
  "HISTORIA",
  "GEOGRAFIA",
  "EDUCACAO FINANCEIRA",
  "TECNOLOGIA E INOVACAO",
  "REDACAO E LEITURA",
];
export const names = [
  "ALUNA FICTICIA ANA CAROLINA DE OLIVEIRA E ALBUQUERQUE",
  "ALUNO FICTICIO SEM DADOS",
  "ALUNA FICTICIA BIANCA",
  "ALUNO FICTICIO CAIO",
  "ALUNA FICTICIA DANIELA",
  "ALUNO FICTICIO EDUARDO",
  "ALUNA FICTICIA FERNANDA",
  "ALUNO FICTICIO GABRIEL",
  "ALUNA FICTICIA HELENA",
];
export function workbook(rows: unknown[][]) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(rows),
    "Dados fictícios",
  );
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
export function mapao() {
  return workbook([
    ["ALUNO", "SITUACAO", ...subjects.flatMap((subject) => [subject, subject])],
    ["", "", ...subjects.flatMap(() => ["M", "F"])],
    ...names.map((name, i) => [
      name,
      "ATIVO",
      ...subjects.flatMap((_, j) => [
        i === 1 ? null : i === 0 ? j % 5 : i === 2 ? 8 : (i + j) % 11,
        i === 1 ? null : 2,
      ]),
    ]),
    [
      "ALUNO FICTICIO INATIVO",
      "TRANSFERIDO",
      ...subjects.flatMap(() => [3, 2]),
    ],
  ]);
}
export function prova() {
  return workbook([
    [
      "ALUNO",
      "PARTICIPACAO",
      "ACERTOS",
      "MAT",
      "PORT",
      "ING",
      "HIST",
      "GEO",
      "CIE",
      "FIN",
      "TEC",
    ],
    [names[0], 0.9, 0.65, 0.4, 0.7, 0.8, 0.5, 0.6, 0.75, 0.4, 0.9],
  ]);
}
export function frequencia() {
  return workbook([
    ["ALUNO", "FREQUENCIA ANUAL", "TUTOR"],
    [names[0], 0.92, "TUTOR FICTICIO"],
    [names[2], 0, ""],
  ]);
}

export function evolutionMapao(term: number) {
  // Cinco melhoras positivas, uma queda, estabilidade, zero real e notas ausentes.
  const before = [1, 2, 3, 4, 5, 9, 6, 0, null];
  const after = [7, 7, 7, 7, 7, 6, 6, 0, null];
  return workbook([
    ["ALUNO", "SITUACAO", ...subjects.flatMap((subject) => [subject, subject])],
    ["", "", ...subjects.flatMap(() => ["M", "F"])],
    ...names.map((name, index) => [name, "ATIVO", ...subjects.flatMap((_, column) => [
      column === 7 && index === 4 ? "ET" : term === 1 ? before[index] : after[index], 2,
    ])]),
  ]);
}
