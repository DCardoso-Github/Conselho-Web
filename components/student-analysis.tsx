"use client";
import { useEffect, useState, type ComponentProps } from "react";
import type { GradePeriodRecord } from "@/lib/db";
import { comparePeriods, periodLabel } from "@/lib/evolution";
import { compareProvaPaulista } from "@/lib/prova-evolution";
import { defaultComparison, type PresentationCheckpoint } from "@/lib/analysis-navigation";
import { schoolYears } from "@/lib/annual-evolution";
import { AnnualReport } from "./annual-evolution";
import { StudentPanels } from "./student-panels";

type Props = Omit<ComponentProps<typeof StudentPanels>, "evolution" | "annualReport" | "comparisonLabels" | "provaEvolution"> & {
  periods: GradePeriodRecord[];
  initial?: PresentationCheckpoint;
  onAnalysisChange?: (state: PresentationCheckpoint) => void;
  startInEvolution?: boolean;
  allowEvolution?: boolean;
};
export function StudentAnalysis({ periods, initial, onAnalysisChange, startInEvolution, allowEvolution = false, ...props }: Props) {
  const defaults = defaultComparison(periods);
  const [beforeId,setBeforeId] = useState(initial?.beforeId ?? defaults.before?.id ?? "");
  const [afterId,setAfterId] = useState(initial?.afterId ?? defaults.after?.id ?? "");
  const years = schoolYears(periods);
  const [chosenYear, setChosenYear] = useState(initial?.annualYear);
  const year = chosenYear && years.includes(chosenYear) ? chosenYear : years[0];
  const [panel,setPanel] = useState(initial?.panel ?? (startInEvolution ? "evolution" : "grades"));
  const before = periods.find(p=>p.id===beforeId) ?? defaults.before;
  const after = periods.find(p=>p.id===afterId) ?? defaults.after;
  const available = allowEvolution && !!defaults.before;
  const valid = available && before && after && before.year===after.year && before.term<after.term;
  const evolution = valid ? comparePeriods([props.student],before,after)[0] : undefined;
  const panels = ["grades", "pp", "support"];
  if (available) panels.push("evolution");
  if (year) panels.push("annual");
  const activePanel = panels.includes(panel) ? panel : "grades";
  useEffect(() => {
    onAnalysisChange?.({ panel: activePanel, annualYear: year, beforeId: before?.id, afterId: after?.id });
  }, [activePanel,year,before?.id,after?.id,onAnalysisChange]);
  const controls = available ? <div className="individual-periods">
    <label>Bimestre inicial<select aria-label="Bimestre inicial" value={before?.id ?? ""} onChange={e=>setBeforeId(e.target.value)}>
      {periods.map(p=><option key={p.id} value={p.id}>{periodLabel(p)}</option>)}
    </select></label>
    <label>Bimestre final<select aria-label="Bimestre final" value={after?.id ?? ""} onChange={e=>setAfterId(e.target.value)}>
      {periods.map(p=><option key={p.id} value={p.id}>{periodLabel(p)}</option>)}
    </select></label>
    {!valid && <p role="alert">Escolha um bimestre final posterior ao inicial, do mesmo ano.</p>}
  </div> : undefined;
  return <StudentPanels {...props}
    annualReport={year ? <>
      {years.length > 1 && <label className="form-field">Ano letivo<select value={year} onChange={event => setChosenYear(Number(event.target.value))}>{years.map(y => <option key={y}>{y}</option>)}</select></label>}
      <AnnualReport classId={props.student.classId} student={props.student} periods={periods} year={year} />
    </> : undefined}
    activePanel={activePanel} onPanelChange={setPanel}
    evolution={evolution} comparisonLabels={available ? [before ? periodLabel(before) : "", after ? periodLabel(after) : ""] : undefined}
    provaEvolution={valid ? compareProvaPaulista(props.student,before,after) : undefined}
    comparisonControls={controls}
  />;
}

