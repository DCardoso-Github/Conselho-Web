import { BookOpen, TrendingUp } from "lucide-react";
import type { GradePeriodRecord, StudentRecord } from "@/lib/db";
import { comparePeriods, formatGain, formatGrade, periodLabel } from "@/lib/evolution";
import { studentAverage } from "@/lib/highlights";
import { lowGradeCount } from "@/lib/presentation";
import { StudentPortrait } from "./student-profile";
import { Button } from "./ui/button";

type Props = {
  student: StudentRecord;
  subjects: string[];
  before?: GradePeriodRecord;
  after?: GradePeriodRecord;
  showEvolution: boolean;
  onOpen: (panel: "grades" | "evolution") => void;
};

export function MeetingSummary({ student, subjects, before, after, showEvolution, onOpen }: Props) {
  const average = studentAverage(student, subjects);
  const low = lowGradeCount(student, subjects);
  const comparison = showEvolution && before && after ? comparePeriods([student], before, after)[0] : undefined;

  return <article className="meeting-summary" aria-label="Resumo do aluno">
    <div className="meeting-portrait"><StudentPortrait student={student} decorative /></div>
    <div className="meeting-copy">
      <h1>{student.name}</h1>
      <dl className="meeting-stats">
        <div><dt>Média das notas</dt><dd className={average === null ? "missing-average" : ""}>{average === null ? "Sem informação" : formatGrade(average)}</dd></div>
        <div><dt>Notas vermelhas</dt><dd className={low > 0 ? "attention-number" : ""}>{low}</dd></div>
      </dl>
      {showEvolution && before && after && <p className="meeting-comparison">
        <TrendingUp aria-hidden="true" /><span>{periodLabel(before)} → {periodLabel(after)}<strong>{comparison ? formatGain(comparison.gain) + " na média" : "Sem comparação"}</strong></span>
      </p>}
      <div className="meeting-links">
        <Button size="lg" onClick={() => onOpen("grades")}><BookOpen />Ver disciplinas</Button>
        {showEvolution && before && after && <Button variant="outline" onClick={() => onOpen("evolution")}>Ver evolução</Button>}
      </div>
    </div>
  </article>;
}
