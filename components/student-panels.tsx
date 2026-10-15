"use client";
import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  BookOpen,
  Activity,
  ClipboardList,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import type { StudentRecord } from "@/lib/db";
import { isLowGrade } from "@/lib/actions";
import {
  displayValue,
  hasValue,
  percentage,
  SUBJECT_PAGE_SIZE,
} from "@/lib/presentation";
import { formatSubject } from "@/lib/mapao/subjects";
import { Pagination } from "./pagination";
import { Button } from "./ui/button";

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
}: {
  student: StudentRecord;
  subjects: string[];
}) {
  return (
    <Tabs.Root defaultValue="grades" className="student-panels">
      <Tabs.List className="panel-tabs" aria-label="Informações do aluno">
        <Tabs.Trigger value="grades">
          <BookOpen />
          <span>Notas</span>
        </Tabs.Trigger>
        <Tabs.Trigger value="frequency">
          <Activity />
          <span>Frequência e Prova Paulista</span>
        </Tabs.Trigger>
        <Tabs.Trigger value="support">
          <ClipboardList />
          <span>Acompanhamento</span>
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="grades" className="panel-content">
        <Grades student={student} subjects={subjects} />
      </Tabs.Content>
      <Tabs.Content value="frequency" className="panel-content">
        <Frequency student={student} />
      </Tabs.Content>
      <Tabs.Content value="support" className="panel-content">
        <Support student={student} />
      </Tabs.Content>
    </Tabs.Root>
  );
}

function Grades({
  student,
  subjects,
}: {
  student: StudentRecord;
  subjects: string[];
}) {
  const low = subjects.filter(
    (subject) =>
      hasValue(student.grades[subject]) && isLowGrade(student.grades[subject]),
  );
  const [all, setAll] = useState(false);
  const [page, setPage] = useState(0);
  const selected = all || low.length === 0 ? subjects : low;
  const safePage = Math.min(
    page,
    Math.max(0, Math.ceil(selected.length / SUBJECT_PAGE_SIZE) - 1),
  );
  return (
    <>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Notas do bimestre</p>
          <h2>
            {!all && low.length
              ? "Componentes em atenção"
              : "Todas as disciplinas"}
          </h2>
        </div>
        {low.length > 0 && (
          <Button
            variant="outline"
            aria-pressed={all}
            onClick={() => {
              setAll(!all);
              setPage(0);
            }}
          >
            {all ? "Só notas vermelhas" : "Todas as disciplinas"}
          </Button>
        )}
      </div>
      {!selected.length ? (
        <p className="empty-panel">Sem disciplinas cadastradas.</p>
      ) : (
        <div className="grade-grid">
          {selected
            .slice(
              safePage * SUBJECT_PAGE_SIZE,
              (safePage + 1) * SUBJECT_PAGE_SIZE,
            )
            .map((subject) => {
              const value = student.grades[subject];
              const lowGrade = hasValue(value) && isLowGrade(value);
              return (
                <article
                  className={`grade-tile ${lowGrade ? "grade-low" : ""}`}
                  key={subject}
                >
                  <h3>{formatSubject(subject)}</h3>
                  <strong
                    className={
                      hasValue(value) ? "grade-value" : "missing-value"
                    }
                  >
                    {displayValue(value)}
                  </strong>
                  {lowGrade && (
                    <span className="grade-status">
                      <AlertTriangle aria-hidden="true" /> Nota vermelha
                    </span>
                  )}
                </article>
              );
            })}
        </div>
      )}
      <Pagination
        page={safePage}
        total={selected.length}
        size={SUBJECT_PAGE_SIZE}
        onChange={setPage}
        label="Disciplinas"
      />
    </>
  );
}

function Frequency({ student }: { student: StudentRecord }) {
  const [details, setDetails] = useState(false);
  const [page, setPage] = useState(0);
  const entries = Object.entries(student.provaPaulista?.grades ?? {});
  if (details)
    return (
      <>
        <div className="panel-heading">
          <h2>Prova Paulista por disciplina</h2>
          <Button variant="outline" onClick={() => setDetails(false)}>
            <ArrowLeft /> Resumo
          </Button>
        </div>
        <div className="grade-grid">
          {entries
            .slice(page * SUBJECT_PAGE_SIZE, (page + 1) * SUBJECT_PAGE_SIZE)
            .map(([subject, value]) => (
              <article className="grade-tile" key={subject}>
                <h3>{PP_NAMES[subject] ?? formatSubject(subject)}</h3>
                <strong
                  className={
                    percentage(value) === "Sem informação"
                      ? "missing-value"
                      : "grade-value"
                  }
                >
                  {percentage(value)}
                </strong>
              </article>
            ))}
        </div>
        <Pagination
          page={page}
          total={entries.length}
          size={SUBJECT_PAGE_SIZE}
          onChange={setPage}
          label="Disciplinas"
        />
      </>
    );
  return (
    <>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Participação e resultados</p>
          <h2>Frequência e Prova Paulista</h2>
        </div>
      </div>
      <div className="metrics-grid">
        <Metric
          label="Frequência anual"
          value={percentage(student.frequenciaAnual)}
        />
        <Metric
          label="Participação na Prova Paulista"
          value={percentage(student.provaPaulista?.participacao)}
        />
        <Metric
          label="Acertos na Prova Paulista"
          value={percentage(student.provaPaulista?.acertos)}
        />
      </div>
      {entries.length > 0 ? (
        <Button variant="outline" onClick={() => setDetails(true)}>
          Resultados por disciplina
        </Button>
      ) : (
        <p className="supporting-text">
          Sem resultados por disciplina. A importação está em Gerenciar turma.
        </p>
      )}
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-tile">
      <h3>{label}</h3>
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
            <dt>Tutor(a)</dt>
            <dd>{displayValue(student.tutor)}</dd>
          </div>
          <div>
            <dt>Educação especial</dt>
            <dd>{displayValue(student.educacaoEspecial)}</dd>
          </div>
          <div className="span-full">
            <dt>Programas de acompanhamento</dt>
            <dd>
              {programs.length
                ? programs.join(" · ")
                : "Nenhum programa registrado"}
            </dd>
          </div>
        </dl>
        <section className="notes-block">
          <h3>Observações do conselho</h3>
          <p>{displayValue(student.outrasInformacoes)}</p>
        </section>
        {student.notes && (
          <section className="notes-block">
            <h3>Anotações</h3>
            <p>{student.notes}</p>
          </section>
        )}
      </div>
    </>
  );
}
