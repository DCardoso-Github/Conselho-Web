"use client";
import type { StudentRecord } from "@/lib/db";
import { isLowGrade } from "@/lib/actions";
import { hasLowGrades, hasValue } from "@/lib/presentation";
import { formatSubject } from "@/lib/mapao/subjects";
import { SubjectIcon } from "./subject-icon";
export function ClassDashboard({
  students,
  subjects,
}: {
  students: StudentRecord[];
  subjects: string[];
}) {
  const withLow = students.filter(hasLowGrades).length;
  const perSubject = subjects
    .map((subject) => {
      const lowCount = students.filter(
        (student) =>
          hasValue(student.grades[subject]) &&
          isLowGrade(student.grades[subject]),
      ).length;
      return {
        subject,
        lowCount,
        pct: students.length ? (lowCount / students.length) * 100 : 0,
      };
    })
    .sort((a, b) => b.pct - a.pct);
  const critical = perSubject.filter((subject) => subject.pct >= 30).length;
  return (
    <section className="overview-panel">
      <div className="overview-metrics">
        <article>
          <p>Alunos na turma</p>
          <strong>{students.length}</strong>
        </article>
        <article>
          <p>Com notas vermelhas</p>
          <strong className="attention">{withLow}</strong>
        </article>
        <article>
          <p>Sem notas vermelhas cadastradas</p>
          <strong>
            {students.length
              ? Math.round(
                  ((students.length - withLow) / students.length) * 100,
                ) + "%"
              : "Sem informação"}
          </strong>
        </article>
      </div>
      <div className="panel-heading">
        <h2>Notas vermelhas por disciplina</h2>
      </div>
      <p className="supporting-text">
        {critical} disciplinas com pelo menos 30% dos alunos com notas
        vermelhas.
      </p>
      <div className="subject-summary">
        {perSubject.map(({ subject, lowCount, pct }) => (
          <article key={subject}>
            <h3>
              <SubjectIcon name={subject} />
              {formatSubject(subject)}
            </h3>
            <div
              className="subject-bar"
              role="meter"
              aria-label={formatSubject(subject)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pct)}
              aria-valuetext={`${lowCount} alunos, ${Math.round(pct)}%`}
            >
              <span style={{ width: `${pct}%` }} />
            </div>
            <p>
              <strong>{lowCount}</strong> alunos · {Math.round(pct)}%
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
