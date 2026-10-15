"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  TrendingUp,
  Users,
  AlertTriangle,
  ChartColumn,
  Search,
  ArrowRight,
  Play,
  Target,
  ClipboardCheck,
} from "lucide-react";
import type { GradePeriodRecord, StudentRecord } from "@/lib/db";
import { classEvolution, classProvaEvolution, matchesSearch } from "@/lib/class-analytics";
import { ClassProvaChart } from "./class-prova-chart";
import { analyticsPresentationHref } from "@/lib/analytics-presentation";
import {
  comparePeriods,
  formatGain,
  formatGrade,
  periodLabel,
} from "@/lib/evolution";
import { formatSubject } from "@/lib/mapao/subjects";
import {
  Distribution,
  PairedBars,
  StatCard,
  TableFrame,
  gradeLabel,
} from "./analytics-primitives";
import { SubjectIcon } from "./subject-icon";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const status = (gain: number) =>
  gain > 1e-9 ? "Melhorou" : gain < -1e-9 ? "Reduziu" : "Manteve";
const tone = (gain: number) =>
  gain > 1e-9 ? "positive" : gain < -1e-9 ? "negative" : "";

export function ClassEvolutionDashboard({
  students,
  periods,
  classId,
}: {
  students: StudentRecord[];
  periods: GradePeriodRecord[];
  classId: string;
}) {
  const query = useSearchParams();
  const [beforeId, setBeforeId] = useState(
    () =>
      periods.find((p) => p.id === query.get("before"))?.id ??
      periods.at(-2)?.id ??
      "",
  );
  const [afterId, setAfterId] = useState(
    () =>
      periods.find((p) => p.id === query.get("after"))?.id ??
      periods.at(-1)?.id ??
      "",
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("gain");
  const before = periods.find((p) => p.id === beforeId);
  const after = periods.find((p) => p.id === afterId);
  const valid =
    before && after && before.year === after.year && before.term < after.term;
  const rows = comparePeriods(students, before, after);
  const data = classEvolution(rows);
  const prova = classProvaEvolution(students, before, after);
  const byId = new Map(rows.map((row) => [row.student.id, row]));
  const filtered = students
    .map((student) => ({ student, row: byId.get(student.id) }))
    .filter(
      ({ student, row }) =>
        matchesSearch(student.name, search) &&
        (filter === "all" ||
          (filter === "missing" ? !row : !!row && status(row.gain) === filter)),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.student.name.localeCompare(b.student.name, "pt-BR")
        : !a.row
          ? b.row
            ? 1
            : a.student.order - b.student.order
          : !b.row
            ? -1
            : (sort === "decline"
                ? a.row.gain - b.row.gain
                : b.row.gain - a.row.gain) || a.student.order - b.student.order,
    );
  return (
    <section
      className="analytics-dashboard"
      aria-label="Comparação da turma entre bimestres"
    >
      <div className="analytics-card period-selector">
        <p className="eyebrow">Escolha o intervalo</p>
        <div className="comparison-controls">
          <label className="form-field">
            Bimestre inicial
            <select
              value={beforeId}
              onChange={(e) => setBeforeId(e.target.value)}
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {periodLabel(p)}
                </option>
              ))}
            </select>
          </label>
          <ArrowRight aria-hidden="true" />
          <label className="form-field">
            Bimestre final
            <select
              value={afterId}
              onChange={(e) => setAfterId(e.target.value)}
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {periodLabel(p)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {valid && (
          <div className="analytics-heading projection-launch">
            <Button asChild>
              <Link
                href={analyticsPresentationHref(
                  classId,
                  "evolution",
                  beforeId,
                  afterId,
                )}
              >
                <Play />
                Apresentar evolução da turma
              </Link>
            </Button>
          </div>
        )}
      </div>
      {!valid ? (
        <p className="empty-panel" role="alert">
          Escolha um bimestre final posterior ao inicial, do mesmo ano.
        </p>
      ) : (
        <>
          <div className="analytics-stats">
            <StatCard
              icon={<ChartColumn />}
              label="Média inicial → final"
              value={
                <>
                  {gradeLabel(data.before)}{" "}
                  <span className="stat-arrow">→</span> {gradeLabel(data.after)}
                </>
              }
              detail="Escala de 0 a 10"
            />
            <StatCard
              icon={<TrendingUp />}
              label="Variação da média"
              value={
                data.gain === null
                  ? "Sem informação"
                  : `${formatGain(data.gain)} pts`
              }
              detail="Variação entre os bimestres"
              tone={data.gain === null ? "" : tone(data.gain)}
            />
            <StatCard
              icon={<AlertTriangle />}
              label="Notas vermelhas"
              value={
                data.pairCount
                  ? `${data.lowBefore} → ${data.lowAfter}`
                  : "Sem informação"
              }
              detail="Notas de 0 a 4"
            />
          </div>
          {!rows.length ? (
            <div className="empty-panel">
              <h2>Sem dados para comparação</h2>
              <p>
                Confira os mapões dos bimestres selecionados.
              </p>
            </div>
          ) : (
            <>
              <div className="analytics-columns">
                <section className="analytics-card">
                  <header>
                    <Users aria-hidden="true" />
                    <h3>Movimento da turma</h3>
                  </header>
                  <p>Distribuição dos {students.length} alunos atuais.</p>
                  <Distribution
                    label="Evolução dos alunos"
                    total={students.length}
                    items={[
                      {
                        label: "Melhoraram a média",
                        count: data.improved,
                        tone: "tone-high",
                      },
                      {
                        label: "Mantiveram a média",
                        count: data.stable,
                        tone: "tone-mid",
                      },
                      {
                        label: "Reduziram a média",
                        count: data.declined,
                        tone: "tone-low",
                      },
                      {
                        label: "Sem comparação",
                        count: students.length - rows.length,
                        tone: "tone-missing",
                      },
                    ]}
                  />
                </section>
                <section className="analytics-card">
                  <header>
                    <TrendingUp aria-hidden="true" />
                    <h3>Comparação das médias</h3>
                  </header>
                  <div className="chart-legend">
                    <span>
                      <i className="bar-before" />
                      {periodLabel(before!)}
                    </span>
                    <span>
                      <i className="bar-after" />
                      {periodLabel(after!)}
                    </span>
                  </div>
                  <PairedBars
                    before={data.before!}
                    after={data.after!}
                    label="Média da turma"
                  />
                  <div className="chart-scale" aria-hidden="true">
                    <span>0</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                  <p className="analytics-footnote">
                    Variação: {formatGain(data.gain!)} pontos.
                  </p>
                </section>
              </div>
              <section className="analytics-card">
                <header>
                  <ChartColumn aria-hidden="true" />
                  <h3>Evolução por disciplina</h3>
                </header>
                <p>
                  Resultados por disciplina entre os bimestres.
                </p>
                <div className="chart-legend">
                  <span>
                    <i className="bar-before" />
                    Inicial
                  </span>
                  <span>
                    <i className="bar-after" />
                    Final
                  </span>
                </div>
                <div className="subject-comparison-chart">
                  {data.subjects.map((item) => (
                    <article key={item.subject}>
                      <h4>
                        <SubjectIcon name={item.subject} />
                        {formatSubject(item.subject)}
                      </h4>
                      <PairedBars
                        before={item.before}
                        after={item.after}
                        label={formatSubject(item.subject)}
                      />
                      <p>
                        <span className={`data-pill ${tone(item.gain)}`}>
                          {formatGain(item.gain)} pts
                        </span>
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
          <section className="class-prova-section" aria-labelledby="class-prova-heading">
            <div className="analytics-heading">
              <h2 id="class-prova-heading">Evolução da Prova Paulista</h2>
              <p>Acertos e participação entre os bimestres selecionados.</p>
            </div>
            <div className="analytics-columns">
              <section className="analytics-card">
                <header><Target aria-hidden="true" /><h3>Acertos</h3></header>
                <ClassProvaChart data={prova.acertos} label="Acertos" before={before!} after={after!} />
              </section>
              <section className="analytics-card">
                <header><ClipboardCheck aria-hidden="true" /><h3>Participação</h3></header>
                <ClassProvaChart data={prova.participacao} label="Participação" before={before!} after={after!} />
              </section>
            </div>
            <div className="analytics-heading">
              <h3 className="pp-subject-heading">Acertos por disciplina</h3>
            </div>
            {prova.subjects.length ? (
              <div className="analytics-columns">
                {prova.subjects.map((subject) => (
                  <section className="analytics-card" key={subject.subject}>
                    <header>
                      <span aria-hidden="true"><SubjectIcon name={subject.label} /></span>
                      <h4>{subject.label}</h4>
                    </header>
                    <ClassProvaChart data={subject} label={`Acertos em ${subject.label}`} before={before!} after={after!} />
                  </section>
                ))}
              </div>
            ) : (
              <p className="empty-panel">Sem informação por disciplina. Importe a Prova Paulista com os acertos por disciplina dos bimestres selecionados.</p>
            )}
          </section>
          <section className="analytics-card">
            <header>
              <Users aria-hidden="true" />
              <h3>Todos os alunos, com contexto</h3>
            </header>
            <div className="analytics-filters">
              <label className="search-field">
                <Search aria-hidden="true" />
                <Input
                  aria-label="Buscar aluno na comparação"
                  placeholder="Buscar aluno…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <label className="form-field">
                Resultado
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">Todos</option>
                  <option>Melhorou</option>
                  <option>Manteve</option>
                  <option>Reduziu</option>
                  <option value="missing">Sem comparação</option>
                </select>
              </label>
              <label className="form-field">
                Ordenar
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="gain">Maior melhora</option>
                  <option value="decline">Maior redução</option>
                  <option value="name">Nome</option>
                </select>
              </label>
            </div>
            <p className="results-count" role="status">
              {filtered.length} de {students.length} alunos
            </p>
            <TableFrame label="Evolução de todos os alunos">
              <table className="analytics-table">
                <caption>
                  {periodLabel(before!)} → {periodLabel(after!)}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Aluno</th>
                    <th scope="col">Inicial</th>
                    <th scope="col">Final</th>
                    <th scope="col">Variação</th>
                    <th scope="col">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(({ student, row }) => (
                    <tr key={student.id}>
                      <th scope="row">
                        <Link
                          href={`/turmas/${encodeURIComponent(classId)}/alunos/${student.id}`}
                        >
                          {student.name}
                        </Link>
                      </th>
                      <td>{row ? formatGrade(row.before) : "—"}</td>
                      <td>{row ? formatGrade(row.after) : "—"}</td>
                      <td>
                        {row ? (
                          <span className={`data-pill ${tone(row.gain)}`}>
                            {formatGain(row.gain)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{row ? status(row.gain) : "Sem comparação"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableFrame>
            {!filtered.length && (
              <p className="analytics-empty">
                Nenhum aluno corresponde à busca e aos filtros.
              </p>
            )}
          </section>
          <div className="analytics-heading">
            <Button asChild variant="outline">
              <Link href={`/turmas/${encodeURIComponent(classId)}`}>
                <ArrowRight />
                Voltar aos alunos da turma
              </Link>
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
