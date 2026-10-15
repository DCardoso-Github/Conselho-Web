"use client";
import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Users,
  AlertTriangle,
  ChartColumn,
  Search,
  ArrowRight,
} from "lucide-react";
import type { GradePeriodRecord, StudentRecord } from "@/lib/db";
import { classEvolution, matchesSearch } from "@/lib/class-analytics";
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
  const [beforeId, setBeforeId] = useState(periods.at(-2)?.id ?? "");
  const [afterId, setAfterId] = useState(periods.at(-1)?.id ?? "");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("gain");
  const before = periods.find((p) => p.id === beforeId);
  const after = periods.find((p) => p.id === afterId);
  const valid =
    before && after && before.year === after.year && before.term < after.term;
  const rows = comparePeriods(students, before, after);
  const data = classEvolution(rows);
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
        <p className="analytics-footnote">
          Mesmos alunos, mesmas disciplinas e notas numéricas nos dois
          bimestres. A média da turma dá o mesmo peso a cada aluno comparável.
        </p>
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
              detail="Escala de 0 a 10 · mesma base de comparação"
            />
            <StatCard
              icon={<TrendingUp />}
              label="Variação da média"
              value={
                data.gain === null
                  ? "Sem informação"
                  : `${formatGain(data.gain)} pts`
              }
              detail="Pontos na média dos alunos comparáveis"
              tone={data.gain === null ? "" : tone(data.gain)}
            />
            <StatCard
              icon={<Users />}
              label="Alunos comparáveis"
              value={`${rows.length} / ${students.length}`}
              detail={`${students.length - rows.length} sem comparação disponível`}
            />
            <StatCard
              icon={<AlertTriangle />}
              label="Notas vermelhas"
              value={
                data.pairCount
                  ? `${data.lowBefore} → ${data.lowAfter}`
                  : "Sem informação"
              }
              detail={`${data.pairCount} pares de notas · limite de 0 a 4`}
            />
          </div>
          {!rows.length ? (
            <div className="empty-panel">
              <h2>Sem notas comparáveis</h2>
              <p>
                Confira nomes únicos e disciplinas com notas numéricas nos dois
                mapões. Dados ausentes não viram zero.
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
                    Variação: {formatGain(data.gain!)} pontos. A comparação
                    inclui apenas os {rows.length} alunos com notas
                    correspondentes.
                  </p>
                </section>
              </div>
              <section className="analytics-card">
                <header>
                  <ChartColumn aria-hidden="true" />
                  <h3>Evolução por disciplina</h3>
                </header>
                <p>
                  Comparação das mesmas notas em cada disciplina · escala de 0 a
                  10.
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
                        <small>{item.count} alunos comparados</small>
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
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
                  {periodLabel(before!)} → {periodLabel(after!)}. Cada média
                  considera somente as disciplinas comparáveis daquele aluno.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Aluno</th>
                    <th scope="col">Inicial</th>
                    <th scope="col">Final</th>
                    <th scope="col">Variação</th>
                    <th scope="col">Disciplinas</th>
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
                      <td>{row?.subjects.length ?? "—"}</td>
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
            <p className="analytics-footnote">
              “Sem comparação”: nome sem correspondência única ou nenhuma
              disciplina com nota numérica nos dois bimestres. Alunos que não
              estão na turma atual ficam fora.
            </p>
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
