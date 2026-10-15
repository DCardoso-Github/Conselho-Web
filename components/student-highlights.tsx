"use client";
import Link from "next/link";
import { Play, Star } from "lucide-react";
import type { StudentRecord } from "@/lib/db";
import { studentHighlights } from "@/lib/highlights";
import { StudentCard } from "./student-card";
import { Button } from "./ui/button";

export function StudentHighlights({
  students,
  subjects,
  classId,
}: {
  students: StudentRecord[];
  subjects: string[];
  classId: string;
}) {
  const highlights = studentHighlights(students, subjects);
  return (
    <section aria-label="Alunos destaque da turma">
      <div className="highlights-heading">
        <div>
          <h2>
            <Star aria-hidden="true" /> Alunos destaque
          </h2>
          <p>Até seis alunos com maior média nas notas do bimestre.</p>
        </div>
        {highlights.length > 0 && (
          <Button asChild>
            <Link
              href={`/turmas/${encodeURIComponent(classId)}/apresentar?scope=top`}
            >
              <Play aria-hidden="true" /> Apresentar destaques
            </Link>
          </Button>
        )}
      </div>
      <p className="highlight-criteria">
        Somente notas numéricas de 0 a 10 entram na média. Informações ausentes
        e conceitos como ET ficam fora do cálculo. Em empate: menos notas
        vermelhas e depois nome em ordem alfabética.
      </p>
      {highlights.length ? (
        <>
          <p className="results-count" role="status">
            {highlights.length}{" "}
            {highlights.length === 1 ? "aluno destaque" : "alunos destaque"} ·
            seleção da turma inteira
          </p>
          <div className="selection-grid student-selection-grid">
            {highlights.map((highlight) => (
              <StudentCard
                key={highlight.student.id}
                classId={classId}
                student={highlight.student}
                highlight={highlight}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="empty-panel">
          <Star aria-hidden="true" />
          <h3>Ainda não há notas para selecionar destaques</h3>
          <p>Importe ou preencha notas numéricas dos alunos desta turma.</p>
        </div>
      )}
    </section>
  );
}
