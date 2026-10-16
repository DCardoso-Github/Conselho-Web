import type { ReactNode } from "react";
import Link from "next/link";
import { formatGrade } from "@/lib/evolution";

export const gradeLabel = (value: number | null) =>
  value === null ? "Sem informação" : formatGrade(value);
export function StatCard({
  icon,
  label,
  value,
  detail,
  tone = "",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  detail?: string;
  tone?: string;
}) {
  return (
    <article className={`analytics-stat ${tone}`}>
      <span className="analytics-icon" aria-hidden="true">
        {icon}
      </span>
      <p>{label}</p>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}
export function Distribution({
  items,
  total,
  label,
}: {
  items: { label: string; count: number; tone: string; href?: string }[];
  total: number;
  label: string;
}) {
  return (
    <div className="distribution" role="group" aria-label={label}>
      <div className="distribution-track">
        {items.map((item) => (
          item.href && item.count > 0 ? <Link key={item.label} href={item.href}
            className={item.tone} style={{ width: `${total ? (item.count / total) * 100 : 0}%` }}
            aria-label={`${item.label}: ${item.count} notas. Ver alunos.`} /> :
          <span
            key={item.label}
            aria-hidden="true"
            className={item.tone}
            style={{ width: `${total ? (item.count / total) * 100 : 0}%` }}
          />
        ))}
      </div>
      <ul className="distribution-legend">
        {items.map((item) => (
          <li key={item.label}>
            <span className={`legend-dot ${item.tone}`} aria-hidden="true" />
            {item.href ? <Link className="chart-link" href={item.href}>{item.label}<span className="sr-only"> · Ver alunos</span></Link> : <span>{item.label}</span>}
            <strong>{item.count}</strong>
            <small>{total ? Math.round((item.count / total) * 100) : 0}%</small>
          </li>
        ))}
      </ul>
      <ChartTable label={label} headers={["Faixa","Quantidade","Percentual"]} rows={items.map(item=>[item.label,item.count,`${total ? Math.round(item.count/total*100) : 0}%`])} />
    </div>
  );
}
export function PairedBars({
  before,
  after,
  label,
  percentage = false,
}: {
  before: number;
  after: number;
  label: string;
  percentage?: boolean;
}) {
  const suffix = percentage ? "%" : "";
  return (
    <div className="paired-chart">
    <div
      className="paired-bars"
      role="img"
      aria-label={`${label}: média inicial ${formatGrade(before)}${suffix}, média final ${formatGrade(after)}${suffix}. Escala de zero a ${percentage ? "cem por cento" : "dez"}.`}
    >
      <div>
        <span className="bar-track">
          <i className="bar-before" style={{ width: `${before * (percentage ? 1 : 10)}%` }} />
        </span>
        <b>{formatGrade(before)}{suffix}</b>
      </div>
      <div>
        <span className="bar-track">
          <i className="bar-after" style={{ width: `${after * (percentage ? 1 : 10)}%` }} />
        </span>
        <b>{formatGrade(after)}{suffix}</b>
      </div>
    </div>
    <ChartTable label={label} headers={["Período","Valor"]} rows={[["Inicial",`${formatGrade(before)}${suffix}`],["Final",`${formatGrade(after)}${suffix}`]]} />
    </div>
  );
}
export function ChartTable({ label, headers, rows }: { label: string; headers: string[]; rows: ReactNode[][] }) {
  return <details className="chart-table">
    <summary>Ver tabela<span className="sr-only"> · {label}</span></summary>
    <TableFrame label={label}><table className="analytics-table"><caption>{label}</caption>
      <thead><tr>{headers.map(h=><th key={h} scope="col">{h}</th>)}</tr></thead>
      <tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=>j===0?<th key={j} scope="row">{cell}</th>:<td key={j}>{cell}</td>)}</tr>)}</tbody>
    </table></TableFrame>
  </details>;
}
export function TableFrame({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      className="analytics-table-wrap"
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
