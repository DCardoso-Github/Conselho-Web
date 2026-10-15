import type { SchoolPeriod } from "@/lib/db";
import type { classProvaEvolution } from "@/lib/class-analytics";
import { formatGain, periodLabel } from "@/lib/evolution";
import { PairedBars } from "./analytics-primitives";

export function ClassProvaChart({ data, label, before, after }: {
  data: ReturnType<typeof classProvaEvolution>["acertos"];
  label: string;
  before: SchoolPeriod;
  after: SchoolPeriod;
}) {
  return (
    <div className="class-prova-chart">
      <div className="chart-legend">
        <span><i className="bar-before" />{periodLabel(before)}</span>
        <span><i className="bar-after" />{periodLabel(after)}</span>
      </div>
      {data.before === null || data.after === null || data.gain === null ? (
        <div className="analytics-empty">
          <p>Sem informação para comparar {label.toLocaleLowerCase("pt-BR")}.</p>
          <p>Importe a Prova Paulista dos dois bimestres selecionados.</p>
        </div>
      ) : (
        <>
          <PairedBars label={`Prova Paulista · ${label}`} before={data.before} after={data.after} percentage />
          <div className="chart-scale" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>
          <p className="pp-class-gain">Variação <strong className={data.gain > 1e-9 ? "positive" : data.gain < -1e-9 ? "negative" : ""}>{formatGain(data.gain)} p.p.</strong></p>
          <p className="analytics-footnote">Média dos mesmos {data.count} {data.count === 1 ? "aluno nos" : "alunos nos"} dois bimestres.</p>
        </>
      )}
    </div>
  );
}
