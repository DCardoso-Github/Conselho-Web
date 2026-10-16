import { ClipboardCheck } from "lucide-react";
import { formatGain, formatGrade } from "@/lib/evolution";
import { PP_NAMES, type PercentageChange, type ProvaEvolution } from "@/lib/prova-evolution";
import { SubjectIcon } from "./subject-icon";

const tone = (gain: number) => gain > 1e-9 ? "evolution-positive" : gain < -1e-9 ? "evolution-negative" : "";
const pct = (value: number | null) => value === null ? "Sem informação" : `${formatGrade(value)}%`;
function Change({ label, change, compact }: { label: string; change: PercentageChange | null; compact: boolean }) {
  return <div><span>{label}</span>{change ? <><strong className={tone(change.gain)}>{formatGain(change.gain)} p.p.</strong>{!compact && <small>{pct(change.before)} → {pct(change.after)}</small>}</> : <small>Sem comparação</small>}</div>;
}
export function ProvaEvolutionSummary({ comparison, compact = false, labels, presentation = false }: { comparison?: ProvaEvolution; compact?: boolean; labels?: [string, string]; presentation?: boolean }) {
  if (presentation) return <section className="prova-presentation" aria-label="Evolução na Prova Paulista">
    {comparison?.hasBothPeriods ? <>
      <div className="prova-evolution-metrics">
        <Change label="Acertos" change={comparison.acertos} compact={false} />
        <Change label="Participação" change={comparison.participacao} compact={false} />
      </div>
      <p className="prova-presentation-caption">Acertos por disciplina · inicial → final · variação em p.p.</p>
      <div className="prova-presentation-subjects">
        {comparison.subjects.map(row => <article key={row.subject}>
          <h3><SubjectIcon name={row.subject} />{PP_NAMES[row.subject] ?? row.subject}</h3>
          <p>{pct(row.before)} <span aria-label="para">→</span> {pct(row.after)}</p>
          {row.change ? <strong className={tone(row.change.gain)}>{formatGain(row.change.gain)} p.p.</strong> : <span>Sem comparação</span>}
        </article>)}
      </div>
    </> : <p className="empty-panel">Importe a Prova Paulista dos dois bimestres selecionados para comparar os resultados.</p>}
  </section>;
  return <section className={`prova-evolution ${compact ? "compact" : ""}`} aria-label="Evolução na Prova Paulista">
    <h3><ClipboardCheck aria-hidden="true" /> Prova Paulista</h3>
    {labels && <p className="comparison-period-label">{labels[0]} → {labels[1]}</p>}
    {comparison?.hasBothPeriods ? <>
      <div className="prova-evolution-metrics">
        <Change label="Acertos" change={comparison.acertos} compact={compact} />
        <Change label="Participação" change={comparison.participacao} compact={compact} />
      </div>
      {!compact && !!comparison.subjects.length && <div className="prova-evolution-table" tabIndex={0} role="region" aria-label="Comparação da Prova Paulista por disciplina">
        <table><caption>Resultados por disciplina · variação em pontos percentuais</caption><thead><tr><th scope="col">Disciplina</th><th scope="col">Inicial</th><th scope="col">Final</th><th scope="col">Variação</th></tr></thead>
          <tbody>{comparison.subjects.map(row => <tr key={row.subject}><th scope="row">{PP_NAMES[row.subject] ?? row.subject}</th><td>{pct(row.before)}</td><td>{pct(row.after)}</td><td>{row.change ? <strong className={tone(row.change.gain)}>{formatGain(row.change.gain)} p.p.</strong> : "Sem comparação"}</td></tr>)}</tbody>
        </table>
      </div>}
    </> : <p className="supporting-text">{compact ? "Sem comparação entre bimestres" : "Importe a Prova Paulista dos dois bimestres selecionados para comparar os resultados."}</p>}
    {!compact && <p className="supporting-text">Indicador complementar. A ordem dos alunos evolução continua baseada nas notas do bimestre.</p>}
  </section>;
}
