import type { ReactNode } from "react";
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
  detail: string;
  tone?: string;
}) {
  return (
    <article className={`analytics-stat ${tone}`}>
      <span className="analytics-icon" aria-hidden="true">
        {icon}
      </span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
export function Distribution({
  items,
  total,
  label,
}: {
  items: { label: string; count: number; tone: string }[];
  total: number;
  label: string;
}) {
  return (
    <div className="distribution" role="group" aria-label={label}>
      <div className="distribution-track" aria-hidden="true">
        {items.map((item) => (
          <span
            key={item.label}
            className={item.tone}
            style={{ width: `${total ? (item.count / total) * 100 : 0}%` }}
          />
        ))}
      </div>
      <ul className="distribution-legend">
        {items.map((item) => (
          <li key={item.label}>
            <span className={`legend-dot ${item.tone}`} aria-hidden="true" />
            <span>{item.label}</span>
            <strong>{item.count}</strong>
            <small>{total ? Math.round((item.count / total) * 100) : 0}%</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
export function PairedBars({
  before,
  after,
  label,
}: {
  before: number;
  after: number;
  label: string;
}) {
  return (
    <div
      className="paired-bars"
      role="img"
      aria-label={`${label}: média inicial ${formatGrade(before)}, média final ${formatGrade(after)}. Escala de zero a dez.`}
    >
      <div>
        <span className="bar-track">
          <i className="bar-before" style={{ width: `${before * 10}%` }} />
        </span>
        <b>{formatGrade(before)}</b>
      </div>
      <div>
        <span className="bar-track">
          <i className="bar-after" style={{ width: `${after * 10}%` }} />
        </span>
        <b>{formatGrade(after)}</b>
      </div>
    </div>
  );
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
