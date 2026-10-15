"use client";
import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { TrendingUp, Upload, Play } from "lucide-react";
import {
  db,
  type ClassRecord,
  type GradePeriodRecord,
  type StudentRecord,
} from "@/lib/db";
import {
  comparePeriods,
  evolutionLeaders,
  formatGain,
  formatGrade,
  periodLabel,
  periodOrder,
  type StudentEvolution as Evolution,
} from "@/lib/evolution";
import { formatSubject } from "@/lib/mapao/subjects";
import { StudentProfile } from "./student-profile";
import { SubjectIcon } from "./subject-icon";
import { Button } from "./ui/button";

export function StudentEvolution({
  cls,
  students,
  onImport,
}: {
  cls: ClassRecord;
  students: StudentRecord[];
  onImport: () => void;
}) {
  const periods = useLiveQuery(
    () => db.gradePeriods.where("classId").equals(cls.id).toArray(),
    [cls.id],
  );
  if (!periods) return <p className="empty-panel">Carregando bimestres…</p>;
  return (
    <EvolutionSelection
      key={periods
        .map((item) => item.id)
        .sort()
        .join(":")}
      cls={cls}
      students={students}
      periods={[...periods].sort((a, b) => periodOrder(a) - periodOrder(b))}
      onImport={onImport}
    />
  );
}

function EvolutionSelection({
  cls,
  students,
  periods,
  onImport,
}: {
  cls: ClassRecord;
  students: StudentRecord[];
  periods: GradePeriodRecord[];
  onImport: () => void;
}) {
  const [beforeId, setBeforeId] = useState(() => periods.at(-2)?.id ?? "");
  const [afterId, setAfterId] = useState(() => periods.at(-1)?.id ?? "");
  const [showAll, setShowAll] = useState(false);
  const before = periods.find((period) => period.id === beforeId);
  const after = periods.find((period) => period.id === afterId);
  const valid =
    !!before &&
    !!after &&
    before.year === after.year &&
    before.term < after.term;
  const comparisons = comparePeriods(students, before, after);
  const leaders = evolutionLeaders(comparisons);
  const heading = (
    <div className="highlights-heading">
      <div>
        <h2>
          <TrendingUp aria-hidden="true" />
          Alunos evolução
        </h2>
        <p>
          Até cinco alunos com as maiores melhoras de notas entre bimestres.
        </p>
      </div>
      <Button variant="outline" onClick={onImport}>
        <Upload />
        Mapões e bimestres
      </Button>
    </div>
  );
  if (periods.length < 2)
    return (
      <section aria-label="Alunos evolução da turma">
        {heading}
        <div className="empty-panel">
          <TrendingUp />
          <h3>Vamos acompanhar a evolução</h3>
          <p>
            {!cls.currentPeriod
              ? "Identifique o bimestre das notas atuais e importe o mapão de outro bimestre."
              : "Importe mais um bimestre do mesmo ano para comparar as notas."}
          </p>
          <Button onClick={onImport}>Adicionar bimestres</Button>
        </div>
      </section>
    );
  return (
    <section aria-label="Alunos evolução da turma">
      {heading}
      <div className="comparison-controls">
        <label className="form-field">
          Bimestre inicial
          <select
            value={beforeId}
            onChange={(event) => setBeforeId(event.target.value)}
          >
            {periods.map((period) => (
              <option key={period.id} value={period.id}>
                {periodLabel(period)}
              </option>
            ))}
          </select>
        </label>
        <span aria-hidden="true">→</span>
        <label className="form-field">
          Bimestre final
          <select
            value={afterId}
            onChange={(event) => setAfterId(event.target.value)}
          >
            {periods.map((period) => (
              <option key={period.id} value={period.id}>
                {periodLabel(period)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="highlight-criteria">
        Ganho da média nas mesmas disciplinas com nota de 0 a 10 nos dois
        bimestres. Ausências e conceitos como ET ficam fora. Participam alunos
        da turma atual identificados pelo mesmo nome. Em empate: mais
        disciplinas comparadas e depois nome.
      </p>
      {!valid ? (
        <p role="alert" className="empty-panel">
          Escolha um bimestre final posterior ao inicial, do mesmo ano.
        </p>
      ) : (
        <>
          <div className="highlights-heading">
            <p className="results-count" role="status">
              {leaders.length} alunos em evolução · {comparisons.length} de{" "}
              {students.length} alunos com notas comparáveis
            </p>
            {leaders.length > 0 && (
              <Button asChild>
                <Link
                  href={`/turmas/${encodeURIComponent(cls.id)}/apresentar?scope=evolution&year=${before!.year}&baseline=${before!.term}&target=${after!.term}`}
                >
                  <Play />
                  Apresentar evolução
                </Link>
              </Button>
            )}
          </div>
          {leaders.length ? (
            <div className="selection-grid student-selection-grid">
              {leaders.map((row) => (
                <article
                  key={row.student.id}
                  className="student-tile student-highlight evolution-tile"
                >
                  <StudentProfile compact student={row.student} />
                  <div className="student-tile-content">
                    <span className="highlight-label">
                      <TrendingUp aria-hidden="true" />
                      Aluno evolução
                    </span>
                    <h3>{row.student.name}</h3>
                    <div className="highlight-average">
                      <span>Ganho na média</span>
                      <strong className="evolution-positive">
                        {formatGain(row.gain)} <small>pontos</small>
                      </strong>
                      <span>
                        {formatGrade(row.before)} → {formatGrade(row.after)}
                      </span>
                      <small>
                        {row.subjects.length} disciplinas comparadas
                      </small>
                    </div>
                    <Link
                      className="tile-action"
                      href={`/turmas/${encodeURIComponent(cls.id)}/alunos/${row.student.id}`}
                    >
                      Abrir aluno
                    </Link>
                  </div>
                  <details className="evolution-details">
                    <summary>Ver comparação por disciplina</summary>
                    <EvolutionDetail
                      row={row}
                      beforeLabel={periodLabel(before!)}
                      afterLabel={periodLabel(after!)}
                      compact
                    />
                  </details>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-panel">
              <h3>
                {comparisons.length
                  ? "Nenhuma melhora positiva neste intervalo"
                  : "Sem notas comparáveis"}
              </h3>
              <p>
                {comparisons.length
                  ? "Os alunos mantiveram ou reduziram a média nas disciplinas comparadas."
                  : "Confira os nomes dos alunos e as disciplinas com nota nos dois mapões."}
              </p>
            </div>
          )}
          <Button
            variant="outline"
            className="comparison-toggle"
            aria-expanded={showAll}
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Ocultar comparação da turma" : "Comparar turma inteira"}
          </Button>
          {showAll && (
            <div className="class-comparisons">
              {students.map((student) => {
                const row = comparisons.find(
                  (item) => item.student.id === student.id,
                );
                return (
                  <details key={student.id}>
                    <summary>
                      <span>{student.name}</span>
                      <strong
                        className={
                          row && row.gain > 1e-9 ? "evolution-positive" : ""
                        }
                      >
                        {row
                          ? `${formatGain(row.gain)} pontos`
                          : "Sem comparação"}
                      </strong>
                    </summary>
                    {row ? (
                      <EvolutionDetail
                        row={row}
                        beforeLabel={periodLabel(before!)}
                        afterLabel={periodLabel(after!)}
                      />
                    ) : (
                      <p>
                        Sem correspondência única de nome ou sem notas numéricas
                        nas mesmas disciplinas dos dois bimestres. Dados
                        ausentes não são tratados como zero.
                      </p>
                    )}
                  </details>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function EvolutionDetail({
  row,
  beforeLabel,
  afterLabel,
  compact = false,
}: {
  row: Evolution;
  beforeLabel: string;
  afterLabel: string;
  compact?: boolean;
}) {
  return (
    <section
      className={compact ? "evolution-detail compact" : "evolution-detail"}
      aria-label="Comparação de notas"
    >
      <p className="comparison-period-label">
        {beforeLabel} → {afterLabel}
      </p>
      <div className="comparison-summary">
        <span>
          Média inicial<strong>{formatGrade(row.before)}</strong>
        </span>
        <span>
          Média final<strong>{formatGrade(row.after)}</strong>
        </span>
        <span>
          Variação
          <strong className={row.gain > 1e-9 ? "evolution-positive" : ""}>
            {formatGain(row.gain)}
          </strong>
        </span>
      </div>
      <p className="supporting-text">
        {row.subjects.length} disciplinas com nota nos dois bimestres.
      </p>
      <div className="comparison-subjects">
        {row.subjects.map((item) => (
          <article key={item.subject}>
            <h3>
              <SubjectIcon name={item.subject} />
              {formatSubject(item.subject)}
            </h3>
            <p>
              {formatGrade(item.before)} <span aria-label="para">→</span>{" "}
              {formatGrade(item.after)}
            </p>
            <strong className={item.gain > 1e-9 ? "evolution-positive" : ""}>
              {formatGain(item.gain)} pontos
            </strong>
          </article>
        ))}
      </div>
    </section>
  );
}
