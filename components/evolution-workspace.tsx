"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { CalendarDays, GitCompareArrows, Layers, Play } from "lucide-react";
import { db, type ClassRecord, type StudentRecord } from "@/lib/db";
import { annualPresentationHref, schoolYears } from "@/lib/annual-evolution";
import { periodOrder } from "@/lib/evolution";
import { AnnualReport, AnnualRoster } from "./annual-evolution";
import { ClassEvolutionDashboard } from "./class-evolution-dashboard";
import { StudentEvolutionComparison } from "./student-evolution";
import { Button } from "./ui/button";

export function EvolutionWorkspace({ cls, students, view, onImport }: {
  cls: ClassRecord; students: StudentRecord[]; view: "evolution" | "class-evolution"; onImport: () => void;
}) {
  const router = useRouter();
  const query = useSearchParams();
  const records = useLiveQuery(() => db.gradePeriods.where("classId").equals(cls.id).toArray(), [cls.id]);
  const path = `/turmas/${encodeURIComponent(cls.id)}`;
  const years = schoolYears(records ?? []);
  const linkedPeriod = records?.find(period => period.id === query.get("before") || period.id === query.get("after"));
  const requestedYear = Number(query.get("year") ?? linkedPeriod?.year);
  const year = years.includes(requestedYear) ? requestedYear : years[0];
  const paired = query.get("mode") === "pair" || query.has("before") || query.has("after");
  const periods = (records ?? []).filter(period => period.year === year).sort((a, b) => periodOrder(a) - periodOrder(b));
  const classView = view === "class-evolution";
  const viewHref = (pair: boolean, chosenYear = year) => path + "?" + new URLSearchParams({
    view, ...(chosenYear ? { year: String(chosenYear) } : {}), ...(pair ? { mode: "pair" } : {}),
  });
  return <section className="class-evolution-section">
    <header className="section-heading"><h2>{classView ? "Evolução da turma" : "Alunos evolução"}</h2>
      <Button variant="outline" onClick={onImport}><Layers />Mapões e bimestres</Button>
    </header>
    {!records ? <p role="status">Carregando bimestres…</p> : !periods.length ? <div className="empty-panel">
      <CalendarDays aria-hidden="true" /><h3>Comece o histórico do ano</h3>
      <p>Identifique o bimestre do mapão atual ou importe o primeiro mapão da turma.</p>
      <Button onClick={onImport}>Adicionar bimestres</Button>
    </div> : <>
      <div className="evolution-toolbar">
        <nav className="evolution-modes" aria-label="Período de análise">
          <Link href={viewHref(false)} scroll={false} aria-current={!paired ? "page" : undefined}><CalendarDays />Ano inteiro</Link>
          <Link href={viewHref(true)} scroll={false} aria-current={paired ? "page" : undefined}><GitCompareArrows />Dois bimestres</Link>
        </nav>
        {years.length > 1 && <label className="form-field">Ano letivo<select value={year} onChange={event => router.replace(viewHref(paired, Number(event.target.value)), { scroll: false })}>
          {years.map(y => <option key={y}>{y}</option>)}</select></label>}
        {!paired && (classView || students.length > 0) && <Button asChild variant="outline"><Link href={classView ? annualPresentationHref(cls.id, year) : `${path}/apresentar?scope=annual&year=${year}`}><Play />Apresentar ano</Link></Button>}
      </div>
      {!paired ? classView
        ? <AnnualReport classId={cls.id} students={students} periods={periods} year={year} />
        : <AnnualRoster classId={cls.id} students={students} periods={periods} year={year} />
      : periods.length < 2 ? <div className="empty-panel"><h3>Adicione outro bimestre para comparar</h3><Button onClick={onImport}>Adicionar bimestres</Button></div>
      : classView ? <ClassEvolutionDashboard key={year + ":" + query} classId={cls.id} periods={periods} students={students} />
        : <StudentEvolutionComparison key={year} cls={cls} students={students} periods={periods} />}
    </>}
  </section>;
}
