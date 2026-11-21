"use client";
import { useRef, type ReactNode } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  ClipboardCheck,
  CalendarCheck,
  Target,
  AlertTriangle,
  UserRound,
  HeartHandshake,
  Sparkles,
  MessageSquare,
  Filter,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { StudentEvolution } from "@/lib/evolution";
import { EvolutionDetail } from "./student-evolution";
import { ProvaEvolutionSummary } from "./prova-evolution";
import { PP_NAMES, type ProvaEvolution } from "@/lib/prova-evolution";
import type { SchoolPeriod, StudentRecord } from "@/lib/db";
import { formatGrade, periodLabel } from "@/lib/evolution";
import { studentAverage } from "@/lib/highlights";
import { recordPanel, type RecordPanel } from "@/lib/student-record-view";
import { StudentProfile } from "./student-profile";
import { isLowGrade } from "@/lib/actions";
import { displayValue, hasValue, percentage } from "@/lib/presentation";
import { formatSubject } from "@/lib/mapao/subjects";
import { Button } from "./ui/button";
import { SubjectIcon } from "./subject-icon";


export function StudentPanels({
  student, subjects, currentPeriod, onlyLow, onOnlyLowChange, evolution, annualReport, comparisonLabels,
  provaEvolution, comparisonControls, activePanel, onPanelChange, hasPair,
}: {
  annualReport: ReactNode;
  comparisonControls: ReactNode;
  activePanel: RecordPanel;
  onPanelChange: (panel: RecordPanel) => void;
  hasPair: boolean;
  provaEvolution?: ProvaEvolution;
  evolution?: StudentEvolution;
  comparisonLabels?: [string, string];
  student: StudentRecord;
  currentPeriod?: SchoolPeriod;
  subjects: string[];
  onlyLow: boolean;
  onOnlyLowChange: (value: boolean) => void;
}) {
  const isHistory = (panel: RecordPanel) => ["annual", "evolution", "pair-pp"].includes(panel);
  const history = isHistory(activePanel);
  const lastTerm = useRef<RecordPanel>(history ? "grades" : activePanel);
  const lastHistory = useRef<RecordPanel>(history ? activePanel : "annual");
  const choose = (value: string) => {
    const panel = recordPanel(value);
    if (isHistory(panel)) lastHistory.current = panel;
    else lastTerm.current = panel;
    onPanelChange(panel);
  };
  return <Tabs.Root className="student-record" value={history ? "history" : "term"}
    onValueChange={mode => choose(mode === "term" ? lastTerm.current : lastHistory.current)}>
    <header className="record-banner"><StudentProfile student={student} />
      <Tabs.List className="record-switch" aria-label="Visão da ficha">
        <Tabs.Trigger value="term"><CalendarDays aria-hidden="true" />Bimestre</Tabs.Trigger>
        <Tabs.Trigger value="history"><TrendingUp aria-hidden="true" />Evolução</Tabs.Trigger>
      </Tabs.List>
    </header>
    <Tabs.Content value="term" className="record-body">
      <Tabs.Root value={activePanel} onValueChange={choose}>
        <div className="record-bar">
          <h2>{currentPeriod ? periodLabel(currentPeriod) : "Bimestre atual"}</h2>
          <Tabs.List aria-label="Informações do bimestre" className="record-tabs">
            <Tabs.Trigger value="grades"><BookOpen />Notas</Tabs.Trigger>
            <Tabs.Trigger value="pp"><ClipboardCheck />Prova Paulista</Tabs.Trigger>
            <Tabs.Trigger value="support"><HeartHandshake />Acompanhamento</Tabs.Trigger>
          </Tabs.List>
        </div>
        <Tabs.Content value="grades" className="record-content">
          <Academic student={student} subjects={subjects} onlyLow={onlyLow} onOnlyLowChange={onOnlyLowChange} />
        </Tabs.Content>
        <Tabs.Content value="pp" className="record-content">
          <h3 className="record-section-title">{student.provaPaulistaPeriod ? "Prova Paulista · " + periodLabel(student.provaPaulistaPeriod) : "Prova Paulista"}</h3>
          <div className="academic-metrics">
            <Metric icon={ClipboardCheck} label="Participação" value={percentage(student.provaPaulista?.participacao)} />
            <Metric icon={Target} label="Acertos" value={percentage(student.provaPaulista?.acertos)} />
          </div>
          <Academic student={student} subjects={subjects} prova />
        </Tabs.Content>
        <Tabs.Content value="support" className="record-content"><Support student={student} /></Tabs.Content>
      </Tabs.Root>
    </Tabs.Content>
    <Tabs.Content value="history" className="record-body">
      <Tabs.Root value={activePanel} onValueChange={choose}>
        <div className="record-bar"><h2>Evolução do aluno</h2>
          {hasPair && <Tabs.List aria-label="Período da evolução" className="record-tabs">
            <Tabs.Trigger value="annual"><CalendarDays />Ano inteiro</Tabs.Trigger>
            <Tabs.Trigger value="evolution"><BookOpen />Comparar notas</Tabs.Trigger>
            <Tabs.Trigger value="pair-pp"><ClipboardCheck />Comparar prova</Tabs.Trigger>
          </Tabs.List>}
        </div>
        {hasPair && activePanel !== "annual" && comparisonControls}
        {hasPair ? <Tabs.Content value="annual" className="record-content">{annualReport}</Tabs.Content> : <div className="record-content">{annualReport}</div>}
        {hasPair && <>
          <Tabs.Content value="evolution" className="record-content">{comparisonLabels && (evolution ?
            <EvolutionDetail row={evolution} beforeLabel={comparisonLabels[0]} afterLabel={comparisonLabels[1]} /> :
            <div className="empty-panel"><h3>Sem comparação neste intervalo</h3><p>Confira se o aluno tem notas numéricas nas mesmas disciplinas nos dois mapões.</p></div>)}</Tabs.Content>
          <Tabs.Content value="pair-pp" className="record-content">{comparisonLabels && <ProvaEvolutionSummary comparison={provaEvolution} labels={comparisonLabels} presentation />}</Tabs.Content>
        </>}
      </Tabs.Root>
    </Tabs.Content>
  </Tabs.Root>;
}

function Academic({
  student,
  subjects,
  prova = false,
  onlyLow = false,
  onOnlyLowChange,
}: {
  student: StudentRecord;
  subjects: string[];
  prova?: boolean;
  onlyLow?: boolean;
  onOnlyLowChange?: (value: boolean) => void;
}) {
  const allEntries = prova
    ? Object.entries(student.provaPaulista?.grades ?? {})
    : subjects.map((subject) => [subject, student.grades[subject]] as const);
  const lowEntries = allEntries.filter(
    ([, value]) => hasValue(value) && isLowGrade(value),
  );
  const average = studentAverage(student, subjects);
  const entries = !prova && onlyLow ? lowEntries : allEntries;
  return (
    <>
      {!prova && (
        <div className="grade-toolbar">
          <div className="record-average">Média das notas <strong>{average === null ? "Sem informação" : formatGrade(average)}</strong></div>
          <Button
            variant={onlyLow ? "default" : "outline"}
            aria-pressed={onlyLow} aria-label={`Somente notas vermelhas (${lowEntries.length})`}
            onClick={() => onOnlyLowChange?.(!onlyLow)}
          >
            <Filter aria-hidden="true" /> Notas vermelhas ({lowEntries.length})
          </Button>
        </div>
      )}
      <div className="academic-caption sr-only">
        <h2>
          {prova
            ? "Resultados por disciplina"
            : onlyLow
              ? "Disciplinas com notas vermelhas"
              : "Todas as disciplinas"}
        </h2>
      </div>
      {entries.length ? (
        <div
          className={`grade-grid all-grades ${entries.length > 8 ? "grades-dense" : ""} ${entries.length > 15 ? "grades-many" : ""} ${onlyLow && !prova && entries.length <= 4 ? "grades-filtered" : ""}`}
          tabIndex={0}
          role="region"
          aria-label={
            prova
              ? "Todas as disciplinas da Prova Paulista"
              : onlyLow
                ? "Somente notas vermelhas do bimestre"
                : "Todas as notas do bimestre"
          }
        >
          {entries.map(([subject, value]) => {
            const label = prova
              ? (PP_NAMES[subject] ?? formatSubject(subject))
              : formatSubject(subject);
            const shown = prova ? percentage(value) : displayValue(value);
            const missing = shown === "Sem informação";
            const low = !prova && hasValue(value) && isLowGrade(value);
            return (
              <article
                key={subject}
                className={`grade-tile ${low ? "grade-low" : ""} ${missing ? "grade-missing" : ""}`}
              >
                <div className="subject-heading">
                  <span className="subject-symbol" aria-hidden="true">
                    <SubjectIcon name={subject} />
                  </span>
                  <h3>{label}</h3>
                </div>
                <strong className={missing ? "missing-value" : "grade-value"}>
                  {shown}
                </strong>
                {!prova && hasValue(student.absences[subject]) && <small className="record-absences">Faltas · {student.absences[subject]}</small>}
                {low && (
                  <span className="grade-status">
                    <AlertTriangle aria-hidden="true" />
                    Nota vermelha
                  </span>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-panel academic-empty">
          <ClipboardList aria-hidden="true" />
          <p>
            {prova
              ? "Sem resultados da Prova Paulista. Importe a planilha em Gerenciar turma."
              : onlyLow
                ? "Nenhuma nota vermelha para este aluno. Desative o filtro para ver todas as disciplinas."
                : "Sem disciplinas cadastradas."}
          </p>
        </div>
      )}
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <article className="metric-tile">
      <h3>
        <Icon aria-hidden="true" />
        <span>{label}</span>
      </h3>
      <strong
        className={
          value === "Sem informação" ? "missing-value" : "metric-value"
        }
      >
        {value}
      </strong>
    </article>
  );
}

function Support({ student }: { student: StudentRecord }) {
  const programs = [
    student.tutoriaMatematica && "Tutoria de Matemática",
    student.tutoriaPortugues && "Tutoria de Língua Portuguesa",
    student.programaSouMais && "Programa SOU +",
  ].filter(Boolean);
  return (
    <>
      <div
        className="support-scroll"
        tabIndex={0}
        role="region"
        aria-label="Informações de acompanhamento"
      >
        <dl className="support-grid">
          <div><dt><CalendarCheck aria-hidden="true" />Frequência anual</dt><dd>{percentage(student.frequenciaAnual)}</dd></div>
          <div>
            <dt>
              <UserRound aria-hidden="true" />
              Tutor(a)
            </dt>
            <dd>{displayValue(student.tutor)}</dd>
          </div>
          <div>
            <dt>
              <HeartHandshake aria-hidden="true" />
              Educação especial
            </dt>
            <dd>{displayValue(student.educacaoEspecial)}</dd>
          </div>
          <div className="span-full">
            <dt>
              <Sparkles aria-hidden="true" />
              Programas de acompanhamento
            </dt>
            <dd>
              {programs.length
                ? programs.join(" · ")
                : "Nenhum programa registrado"}
            </dd>
          </div>
        </dl>
        <section className="notes-block">
          <h3>
            <MessageSquare aria-hidden="true" />
            Observações do conselho
          </h3>
          <p>{displayValue(student.outrasInformacoes)}</p>
        </section>
        {student.notes && (
          <section className="notes-block">
            <h3>
              <BookOpen aria-hidden="true" />
              Anotações
            </h3>
            <p>{student.notes}</p>
          </section>
        )}
      </div>
    </>
  );
}
