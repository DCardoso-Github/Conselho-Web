"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, ChevronDown, ClipboardCheck, Search } from "lucide-react";
import type { GradePeriodRecord, StudentRecord } from "@/lib/db";
import { annualGrades, annualProva, terms } from "@/lib/annual-evolution";
import { studentTimeline } from "@/lib/analysis-navigation";
import { matchesSearch } from "@/lib/class-analytics";
import { formatGrade } from "@/lib/evolution";
import { formatSubject } from "@/lib/mapao/subjects";
import { TableFrame } from "./analytics-primitives";
import { HistoryLine } from "./student-history-chart";
import { Input } from "./ui/input";

type HistoryProps = { classId: string; periods: GradePeriodRecord[]; year: number };
type MatrixRow = { label: string; values: (number | null)[]; href?: string };

function TermValue({ value, percent }: { value: number | null; percent?: boolean }) {
  if (value === null) return <><span aria-hidden="true">—</span><span className="sr-only">Sem informação</span></>;
  return percent ? value.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%" : formatGrade(value);
}

export function YearMatrix({ rows, label, firstColumn, percent }: {
  rows: MatrixRow[]; label: string; firstColumn: string; percent?: boolean;
}) {
  return <TableFrame label={label}><table className="annual-matrix">
    <caption className="sr-only">{label}</caption>
    <thead><tr><th scope="col">{firstColumn}</th>{terms.map(term => <th key={term} scope="col">{term}º bim.</th>)}</tr></thead>
    <tbody>{rows.map(row => <tr key={row.href ?? row.label}>
      <th scope="row">{row.href ? <Link href={row.href}>{row.label}<ArrowUpRight aria-hidden="true" /></Link> : row.label}</th>
      {row.values.map((value, i) => <td key={terms[i]}><TermValue value={value} percent={percent} /></td>)}
    </tr>)}</tbody>
  </table></TableFrame>;
}

export function YearChart({ points, individual = false }: {
  points: ReturnType<typeof annualGrades>["points"]; individual?: boolean;
}) {
  return <div className="year-trajectory">
    <HistoryLine values={points.map(point => point.average)} />
    <ol className="annual-chart" aria-label="Médias do primeiro ao quarto bimestre">
    {points.map(point => <li key={point.term} className={point.average === null ? "unreported" : undefined}>
      <span className="term-name">{point.term}º bimestre</span>
      <strong className="term-score"><TermValue value={point.average} /></strong>
      <span className="term-note">{!point.imported ? "Sem mapão" : point.average === null ? "Sem nota numérica" :
        individual ? point.count + (point.count === 1 ? " disciplina" : " disciplinas") :
        point.studentsWithGrades + (point.studentsWithGrades === 1 ? " aluno com nota" : " alunos com nota")}</span>
    </li>)}
  </ol></div>;
}

const emptyRoster: StudentRecord[] = [];

export function AnnualReport({ classId, periods, year, students = emptyRoster, student }: HistoryProps & {
  students?: StudentRecord[]; student?: StudentRecord;
}) {
  const grades = useMemo(() => annualGrades(periods, classId, year, student), [periods, classId, year, student]);
  const prova = useMemo(() => annualProva(student ? [student] : students, classId, year), [student, students, classId, year]);
  const imported = grades.points.filter(point => point.imported).length;
  return <div className="annual-report">
    <section className="year-overview">
      <header><div><p className="focus-label">Ano letivo · {year}</p><h3>{student ? "Média do aluno por bimestre" : "Média da turma por bimestre"}</h3></div>
        <span className="year-coverage">{imported} de 4 mapões</span>
      </header>
      <YearChart points={grades.points} individual={!!student} />
      <p className="year-method">{student ? "Média das disciplinas com nota numérica em cada bimestre." : "Média de todas as notas numéricas do mapão de cada bimestre, considerando os alunos daquele período."}</p>
    </section>
    <details className="year-fold"><summary><BookOpen aria-hidden="true" />Notas por disciplina<ChevronDown aria-hidden="true" /></summary>
      <YearMatrix label="Notas por disciplina ao longo do ano" firstColumn="Disciplina" rows={grades.subjects.map(row => ({ label: formatSubject(row.subject), values: row.values }))} />
    </details>
    <details className="year-fold"><summary><ClipboardCheck aria-hidden="true" />Prova Paulista no ano<ChevronDown aria-hidden="true" /></summary>
      {prova.some(row => row.values.some(v => v !== null))
        ? <div>{!student && <p className="year-method">Percentuais médios dos alunos atuais com resultado registrado em cada bimestre.</p>}
          <YearMatrix label="Prova Paulista por bimestre" firstColumn="Indicador" rows={prova} percent /></div>
        : <p>Importe a Prova Paulista com o ano e o bimestre para acompanhar os resultados.</p>}
    </details>
  </div>;
}

export function AnnualRoster({ classId, periods, year, students }: HistoryProps & { students: StudentRecord[] }) {
  const [search, setSearch] = useState("");
  const rows = useMemo(() => students.map(student => ({
    label: student.name,
    href: `/turmas/${encodeURIComponent(classId)}/alunos/${student.id}?scope=annual&year=${year}`,
    values: studentTimeline(student, periods, year).map(point => point.value),
  })), [students, periods, classId, year]);
  const filtered = rows.filter(row => matchesSearch(row.label, search));
  return <section className="year-overview annual-roster">
    <header><div><p className="focus-label">Ano letivo · {year}</p><h3>Médias dos alunos por bimestre</h3></div>
      <label className="search-field"><Search aria-hidden="true" /><Input aria-label="Buscar aluno no ano letivo" placeholder="Buscar aluno…" value={search} onChange={event => setSearch(event.target.value)} /></label>
    </header>
    {filtered.length ? <YearMatrix rows={filtered} firstColumn="Aluno" label="Médias dos alunos nos quatro bimestres" /> : <p role="status">{students.length ? "Nenhum aluno encontrado." : "Esta turma ainda não tem alunos cadastrados."}</p>}
    {filtered.length > 0 && <p className="year-method">O traço indica que o aluno está sem média registrada naquele bimestre.</p>}
  </section>;
}
