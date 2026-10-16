"use client";
import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { TrendingUp, Upload, Play, ArrowUpRight } from "lucide-react";
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
import { studentAverage } from "@/lib/highlights";
import { remainingPresentationStudents } from "@/lib/presentation";
import { StudentProfile } from "./student-profile";
import { StudentTutor } from "./student-tutor";
import { StudentActions } from "./student-actions";
import { ProvaEvolutionSummary } from "./prova-evolution";
import { compareProvaPaulista, type ProvaEvolution } from "@/lib/prova-evolution";
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
  const rest = remainingPresentationStudents(students, leaders.map(row => row.student), cls.subjects, comparisons);
  const comparisonById = new Map(comparisons.map(row => [row.student.id, row]));
  const viewQuery = `scope=evolution&year=${before?.year ?? ""}&baseline=${before?.term ?? ""}&target=${after?.term ?? ""}`;
  const heading = (
    <div className="highlights-heading">
      <div>
        <h2>
          <TrendingUp aria-hidden="true" />
          Alunos evolução
        </h2>
        <p>
          Até seis alunos com as maiores melhoras de notas entre bimestres.
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
      {!valid ? (
        <p role="alert" className="empty-panel">
          Escolha um bimestre final posterior ao inicial, do mesmo ano.
        </p>
      ) : (
        <>
          <div className="highlights-heading">
            <p className="results-count" role="status">
              {leaders.length} alunos em evolução
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
              {leaders.map(row => <EvolutionCard key={row.student.id} classId={cls.id} student={row.student} row={row} prova={row.provaPaulista} viewQuery={viewQuery} leader />)}
            </div>
          ) : (
            <div className="empty-panel">
              <h3>
                {comparisons.length
                  ? "Nenhuma melhora positiva neste intervalo"
                  : "Sem dados para comparação"}
              </h3>
              <p>
                {comparisons.length
                  ? "Os alunos mantiveram ou reduziram a média."
                  : "Confira os mapões dos bimestres selecionados."}
              </p>
            </div>
          )}
          {rest.length > 0 && <>
            <Button variant="outline" className="comparison-toggle" aria-expanded={showAll} aria-controls="evolution-rest" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Ocultar restante da turma" : `Mostrar restante da turma (${rest.length})`}
            </Button>
            {showAll && <div id="evolution-rest" className="selection-grid student-selection-grid">
              {rest.map(student => <EvolutionCard key={student.id} classId={cls.id} student={student} row={comparisonById.get(student.id)} prova={compareProvaPaulista(student, before, after)} viewQuery={viewQuery} />)}
            </div>}
          </>}
        </>
      )}
    </section>
  );
}

const gainTone = (gain: number) => gain > 1e-9 ? "evolution-positive" : gain < -1e-9 ? "evolution-negative" : "";

function EvolutionCard({ classId, student, row, prova, leader = false, viewQuery }: {
  viewQuery: string;
  classId: string;
  student: StudentRecord;
  row?: Evolution;
  prova?: ProvaEvolution;
  leader?: boolean;
}) {
  const average = studentAverage(student);
  return <StudentActions student={student} viewQuery={viewQuery}><article className={`student-tile evolution-tile ${leader ? "student-highlight" : ""}`}>
    <StudentProfile compact student={student} />
    <div className="student-tile-content">
      {leader && <span className="highlight-label"><TrendingUp aria-hidden="true" /> Aluno evolução</span>}
      <h3>{student.name}</h3>
      <StudentTutor tutor={student.tutor} />
      {row ? <div className="highlight-average">
        <span>Variação da média</span>
        <strong className={`evolution-gain ${gainTone(row.gain)}`}>
          <span aria-hidden="true">{row.gain > 0 ? "↑" : row.gain < 0 ? "↓" : "→"}</span> {formatGain(row.gain)} <span>pontos</span>
        </strong>
        <span className="evolution-current">Média final <b>{formatGrade(row.after)}</b></span>
        <span>Média inicial: {formatGrade(row.before)}</span>
      </div> : <div className="highlight-average">
        <span>Média atual</span>
        <strong>{average === null ? "Sem informação" : formatGrade(average)}</strong>
        <small>Sem comparação neste intervalo</small>
      </div>}
    </div>
    <ProvaEvolutionSummary compact comparison={prova} />
    <Link className="tile-action" href={`/turmas/${encodeURIComponent(classId)}/alunos/${student.id}?${viewQuery}`}>Abrir aluno <ArrowUpRight aria-hidden="true" /></Link>
  </article></StudentActions>;
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
          <strong className={gainTone(row.gain)}>
            {formatGain(row.gain)}
          </strong>
        </span>
      </div>
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
            <strong className={gainTone(item.gain)}>
              {formatGain(item.gain)} pontos
            </strong>
          </article>
        ))}
      </div>
    </section>
  );
}
