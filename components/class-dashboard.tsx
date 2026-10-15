"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Users,
  AlertTriangle,
  ChartColumn,
  Database,
  Play,
} from "lucide-react";
import type { StudentRecord } from "@/lib/db";
import { classOverview } from "@/lib/class-analytics";
import { analyticsPresentationHref } from "@/lib/analytics-presentation";
import { formatSubject } from "@/lib/mapao/subjects";
import { SubjectIcon } from "./subject-icon";
import { Button } from "./ui/button";
import {
  Distribution,
  StatCard,
  TableFrame,
  gradeLabel,
} from "./analytics-primitives";

export function ClassDashboard({
  students,
  subjects,
  classId,
}: {
  students: StudentRecord[];
  subjects: string[];
  classId: string;
}) {
  const [order, setOrder] = useState("low");
  const data = classOverview(students, subjects);
  const rows = [...data.rows].sort((a, b) =>
    order === "name"
      ? formatSubject(a.subject).localeCompare(
          formatSubject(b.subject),
          "pt-BR",
        )
      : order === "average"
        ? (a.average ?? 11) - (b.average ?? 11)
        : b.low - a.low || a.subject.localeCompare(b.subject, "pt-BR"),
  );
  const coverage = data.expected
    ? Math.round((data.count / data.expected) * 100)
    : 0;
  return (
    <section className="analytics-dashboard" aria-label="Visão geral da turma">
      <header className="analytics-heading">
        <div>
          <p className="eyebrow">Retrato do bimestre atual</p>
          <h2>Como está a turma?</h2>
          <p>
            Resultados, pontos de atenção e cobertura das notas em um só lugar.
          </p>
        </div>
        <Button asChild>
          <Link href={analyticsPresentationHref(classId, "overview")}>
            <Play />
            Apresentar visão geral
          </Link>
        </Button>
      </header>
      <div className="analytics-stats">
        <StatCard
          icon={<Users />}
          label="Alunos na turma"
          value={students.length}
          detail={`${data.withoutGrades} sem notas numéricas`}
        />
        <StatCard
          icon={<ChartColumn />}
          label="Média das notas"
          value={gradeLabel(data.average)}
          detail={`${data.count} notas numéricas · escala de 0 a 10`}
        />
        <StatCard
          icon={<AlertTriangle />}
          label="Com notas vermelhas"
          value={data.withLow}
          detail="Alunos com pelo menos uma nota de 0 a 4"
          tone="stat-attention"
        />
        <StatCard
          icon={<Database />}
          label="Cobertura das notas"
          value={data.expected ? `${coverage}%` : "Sem informação"}
          detail={`${data.count} de ${data.expected} registros com nota numérica`}
        />
      </div>
      <div className="analytics-columns">
        <section className="analytics-card">
          <header>
            <ChartColumn aria-hidden="true" />
            <h3>Distribuição das notas</h3>
          </header>
          <p>Percentual sobre as {data.count} notas numéricas cadastradas.</p>
          {data.count ? (
            <Distribution
              label="Faixas das notas"
              total={data.count}
              items={[
                {
                  label: "0 a 4 · notas vermelhas",
                  count: data.bands[0],
                  tone: "tone-low",
                },
                {
                  label: "Acima de 4 e abaixo de 7",
                  count: data.bands[1],
                  tone: "tone-mid",
                },
                { label: "7 a 10", count: data.bands[2], tone: "tone-high" },
              ]}
            />
          ) : (
            <p className="analytics-empty">
              Sem notas numéricas para gerar o gráfico.
            </p>
          )}
          <p className="analytics-footnote">
            {data.expected - data.count} registros ausentes ou não numéricos
            (como ET) ficam fora dos cálculos.
          </p>
        </section>
        <section className="analytics-card">
          <header>
            <AlertTriangle aria-hidden="true" />
            <h3>Onde concentrar a atenção</h3>
          </header>
          <p>As cinco disciplinas com mais notas vermelhas.</p>
          <div className="attention-chart">
            {[...data.rows]
              .sort((a, b) => b.low - a.low)
              .filter((row) => row.low > 0)
              .slice(0, 5)
              .map((row) => (
                <div key={row.subject}>
                  <span>{formatSubject(row.subject)}</span>
                  <strong>
                    {row.low} {row.low === 1 ? "aluno" : "alunos"}
                  </strong>
                  <div className="bar-track" aria-hidden="true">
                    <i
                      className="tone-low"
                      style={{
                        width: `${students.length ? (row.low / students.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
          {!data.withLow && (
            <p className="analytics-empty">
              {data.count
                ? "Nenhuma nota vermelha entre as notas cadastradas."
                : "Sem informação para identificar pontos de atenção."}
            </p>
          )}
          <p className="analytics-footnote">
            Comprimento das barras proporcional ao total de alunos da turma.
          </p>
        </section>
      </div>
      <section className="analytics-card">
        <div className="analytics-table-heading">
          <header>
            <ChartColumn aria-hidden="true" />
            <h3>Disciplina por disciplina</h3>
          </header>
          <label className="form-field">
            Ordenar por
            <select value={order} onChange={(e) => setOrder(e.target.value)}>
              <option value="low">Mais notas vermelhas</option>
              <option value="average">Menor média</option>
              <option value="name">Nome da disciplina</option>
            </select>
          </label>
        </div>
        <TableFrame label="Resultados por disciplina">
          <table className="analytics-table">
            <caption>
              Médias usam apenas notas numéricas. O percentual de notas
              vermelhas considera os alunos com nota na disciplina.
            </caption>
            <thead>
              <tr>
                <th scope="col">Disciplina</th>
                <th scope="col">Média</th>
                <th scope="col">Notas vermelhas</th>
                <th scope="col">Com nota</th>
                <th scope="col">Sem nota numérica</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.subject}>
                  <th scope="row">
                    <span className="table-subject">
                      <SubjectIcon name={row.subject} />
                      {formatSubject(row.subject)}
                    </span>
                  </th>
                  <td>{gradeLabel(row.average)}</td>
                  <td>
                    <span
                      className={row.low ? "data-pill negative" : "data-pill"}
                    >
                      {row.lowPercent === null
                        ? "Sem informação"
                        : `${row.low} · ${Math.round(row.lowPercent)}%`}
                    </span>
                  </td>
                  <td>
                    {row.count}/{students.length}
                  </td>
                  <td>{row.missing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableFrame>
        {!rows.length && (
          <p className="analytics-empty">Nenhuma disciplina cadastrada.</p>
        )}
      </section>
    </section>
  );
}
