import type { GradePeriodRecord, StudentRecord } from "@/lib/db";
import { studentTimeline } from "@/lib/analysis-navigation";
import { formatGrade } from "@/lib/evolution";
import { ChartTable } from "./analytics-primitives";
export function StudentHistoryChart({ student, periods, year }: { student: StudentRecord; periods: GradePeriodRecord[]; year: number }) {
  const points = studentTimeline(student, periods, year);
  return <section className="student-history-chart" aria-label="Média ao longo dos bimestres">
    <h3>Média ao longo do ano · {year}</h3>
    <svg viewBox="0 0 640 230" role="img" aria-label="Média individual por bimestre. Escala de zero a dez. Intervalos sem informação aparecem interrompidos.">
      {[0,5,10].map(n => <g key={n}><line x1="50" x2="610" y1={180-n*15} y2={180-n*15} className="history-grid" /><text x="28" y={185-n*15}>{n}</text></g>)}
      {points.map((p,i) => {
        const x = 75+i*170, y = 180-(p.value ?? 0)*15, previous = points[i-1];
        return <g key={p.term}>
          {p.value !== null && previous?.value !== null && previous?.value !== undefined && <line x1={x-170} y1={180-previous.value*15} x2={x} y2={y} className="history-line" />}
          {p.value !== null && <><circle cx={x} cy={y} r="6" className="history-point" /><text x={x} y={y-12} textAnchor="middle">{formatGrade(p.value)}</text></>}
          <text x={x} y="215" textAnchor="middle">{p.term}º bim.</text>
        </g>;
      })}
    </svg>
    <ChartTable label="Média por bimestre" headers={["Bimestre","Média"]} rows={points.map(p=>[p.label,p.value===null?"Sem informação":formatGrade(p.value)])} />
  </section>;
}

