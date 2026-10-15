"use client";
import type { ReactNode } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  BookOpen,
  ClipboardList,
  ClipboardCheck,
  CalendarCheck,
  Target,
  AlertTriangle,
  UserRound,
  HeartHandshake,
  Sparkles,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import type { StudentRecord } from "@/lib/db";
import { isLowGrade } from "@/lib/actions";
import { displayValue, hasValue, percentage } from "@/lib/presentation";
import { formatSubject } from "@/lib/mapao/subjects";
import { SubjectIcon } from "./subject-icon";

const PP_NAMES: Record<string, string> = {
  MAT: "Matemática",
  PORT: "Língua Portuguesa",
  ING: "Língua Inglesa",
  HIST: "História",
  GEO: "Geografia",
  CIE: "Ciências",
  FIN: "Educação Financeira",
  TEC: "Tecnologia e Inovação",
};

export function StudentPanels({
  student,
  subjects,
  profile,
}: {
  student: StudentRecord;
  subjects: string[];
  profile: ReactNode;
}) {
  return (
    <Tabs.Root
      defaultValue="grades"
      className="student-panels presentation-layout"
    >
      <Tabs.List className="panel-tabs" aria-label="Informações do aluno">
        <Tabs.Trigger value="grades">
          <BookOpen aria-hidden="true" />
          <span>Notas do bimestre</span>
        </Tabs.Trigger>
        <Tabs.Trigger value="pp">
          <ClipboardCheck aria-hidden="true" />
          <span>Prova Paulista</span>
        </Tabs.Trigger>
        <Tabs.Trigger value="support">
          <ClipboardList aria-hidden="true" />
          <span>Acompanhamento</span>
        </Tabs.Trigger>
      </Tabs.List>
      <div className="presentation-identity">{profile}</div>
      <Tabs.Content value="grades" className="panel-content academic-panel">
        <Academic student={student} subjects={subjects} />
      </Tabs.Content>
      <Tabs.Content value="pp" className="panel-content academic-panel">
        <Academic student={student} subjects={subjects} prova />
      </Tabs.Content>
      <Tabs.Content value="support" className="panel-content">
        <Support student={student} />
      </Tabs.Content>
      <div
        className="academic-metrics"
        aria-label="Frequência e Prova Paulista"
      >
        <Metric
          icon={CalendarCheck}
          label="Frequência anual"
          value={percentage(student.frequenciaAnual)}
        />
        <Metric
          icon={ClipboardCheck}
          label="Participação · Prova Paulista"
          value={percentage(student.provaPaulista?.participacao)}
        />
        <Metric
          icon={Target}
          label="Acertos · Prova Paulista"
          value={percentage(student.provaPaulista?.acertos)}
        />
      </div>
    </Tabs.Root>
  );
}

function Academic({
  student,
  subjects,
  prova = false,
}: {
  student: StudentRecord;
  subjects: string[];
  prova?: boolean;
}) {
  const entries = prova
    ? Object.entries(student.provaPaulista?.grades ?? {})
    : subjects.map((subject) => [subject, student.grades[subject]] as const);
  return (
    <>
      <div className="academic-caption sr-only">
        <h2>{prova ? "Resultados por disciplina" : "Todas as disciplinas"}</h2>
        <span>{entries.length} disciplinas</span>
      </div>
      {entries.length ? (
        <div
          className={`grade-grid all-grades ${entries.length > 8 ? "grades-dense" : ""}`}
          tabIndex={0}
          role="region"
          aria-label={
            prova
              ? "Todas as disciplinas da Prova Paulista"
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
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Contexto do aluno</p>
          <h2>Acompanhamento</h2>
        </div>
      </div>
      <div
        className="support-scroll"
        tabIndex={0}
        role="region"
        aria-label="Informações de acompanhamento"
      >
        <dl className="support-grid">
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
