"use client";
import { useEffect, useState } from "react";
import type { GradePeriodRecord, SchoolPeriod, StudentRecord } from "@/lib/db";
import { comparePeriods, periodLabel } from "@/lib/evolution";
import { compareProvaPaulista } from "@/lib/prova-evolution";
import { defaultComparison, type PresentationCheckpoint } from "@/lib/analysis-navigation";
import { schoolYears } from "@/lib/annual-evolution";
import { recordPanel } from "@/lib/student-record-view";
import { AnnualReport } from "./annual-evolution";
import { StudentPanels } from "./student-panels";

type Props = {
  student: StudentRecord;
  subjects: string[];
  currentPeriod?: SchoolPeriod;
  periods: GradePeriodRecord[];
  initial?: PresentationCheckpoint;
  onAnalysisChange: (state: PresentationCheckpoint) => void;
  onlyLow: boolean;
  onOnlyLowChange: (value: boolean) => void;
};

export function StudentAnalysis({ periods, currentPeriod, initial, onAnalysisChange, ...props }: Props) {
  const defaults = defaultComparison(periods);
  const [beforeId, setBeforeId] = useState(initial?.beforeId);
  const [afterId, setAfterId] = useState(initial?.afterId);
  const [chosenYear, setChosenYear] = useState(initial?.annualYear);
  const [requested, setRequested] = useState(recordPanel(initial?.panel));
  const years = schoolYears(periods);
  const year = chosenYear && years.includes(chosenYear) ? chosenYear : years[0];
  const before = periods.find(p => p.id === beforeId) ?? defaults.before;
  const after = periods.find(p => p.id === afterId) ?? defaults.after;
  const hasPair = !!defaults.before;
  const pair = requested === "evolution" || requested === "pair-pp";
  const panel = pair && !hasPair ? "annual" : requested;
  const valid = before && after && before.year === after.year && before.term < after.term;
  useEffect(() => {
    onAnalysisChange({ panel, annualYear: year, beforeId: before?.id, afterId: after?.id });
  }, [panel, year, before?.id, after?.id, onAnalysisChange]);

  return <StudentPanels {...props} currentPeriod={currentPeriod} activePanel={panel} onPanelChange={setRequested}
    hasPair={hasPair} comparisonLabels={valid ? [periodLabel(before), periodLabel(after)] : undefined}
    evolution={valid && panel === "evolution" ? comparePeriods([props.student], before, after)[0] : undefined}
    provaEvolution={valid && panel === "pair-pp" ? compareProvaPaulista(props.student, before, after) : undefined}
    comparisonControls={<div className="individual-periods">
      <label>Bimestre inicial<select value={before?.id ?? ""} onChange={event => setBeforeId(event.target.value)}>
        {periods.map(p => <option key={p.id} value={p.id}>{periodLabel(p)}</option>)}
      </select></label>
      <label>Bimestre final<select value={after?.id ?? ""} onChange={event => setAfterId(event.target.value)}>
        {periods.map(p => <option key={p.id} value={p.id}>{periodLabel(p)}</option>)}
      </select></label>
      {!valid && <p role="alert">Escolha um bimestre final posterior ao inicial, do mesmo ano.</p>}
    </div>}
    annualReport={year ? <>
      {years.length > 1 && <label className="form-field">Ano letivo<select value={year} onChange={event => setChosenYear(Number(event.target.value))}>{years.map(y => <option key={y}>{y}</option>)}</select></label>}
      <AnnualReport classId={props.student.classId} student={props.student} periods={periods} year={year} />
    </> : <div className="empty-panel"><h2>Histórico ainda sem bimestres</h2><p>Em Gerenciar turma, abra Mapões e bimestres e identifique o bimestre do primeiro mapão.</p></div>}
  />;
}
