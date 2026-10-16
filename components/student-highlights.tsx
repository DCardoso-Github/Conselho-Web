"use client";
import Link from "next/link";
import { useState } from "react";
import { Play, Star } from "lucide-react";
import type { StudentRecord } from "@/lib/db";
import { studentHighlights } from "@/lib/highlights";
import { remainingPresentationStudents } from "@/lib/presentation";
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
  const [showRest, setShowRest] = useState(false);
  const rest = remainingPresentationStudents(students, highlights.map(item => item.student), subjects);
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
                viewQuery="scope=top"
              />
            ))}
          </div>
        </>
      ) : (
        <div className="empty-panel">
          <Star aria-hidden="true" />
          <h3>Ainda não há notas para selecionar destaques</h3>
          <p>Importe ou preencha as notas dos alunos desta turma.</p>
        </div>
      )}
      {rest.length > 0 && <>
        <Button variant="outline" className="comparison-toggle" aria-expanded={showRest} aria-controls="highlight-rest" onClick={() => setShowRest(!showRest)}>
          {showRest ? "Ocultar restante da turma" : `Mostrar restante da turma (${rest.length})`}
        </Button>
        {showRest && <div id="highlight-rest" className="selection-grid student-selection-grid">
          {rest.map(student => <StudentCard key={student.id} classId={classId} student={student} subjects={subjects} viewQuery="scope=top" />)}
        </div>}
      </>}
    </section>
  );
}
