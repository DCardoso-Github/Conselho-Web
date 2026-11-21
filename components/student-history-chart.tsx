import { formatGrade } from "@/lib/evolution";

export function HistoryLine({ values }: { values: (number | null)[] }) {
  const x = (index: number) => 12.5 + index * 25;
  const y = (value: number) => 93 - value * 8.6;
  return <div className="year-plot" aria-hidden="true">
    <div className="year-axis"><span>10</span><span>5</span><span>0</span></div>
    <div className="year-plot-area">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
        {[0, 5, 10].map(n => <line key={n} x1="0" x2="100" y1={y(n)} y2={y(n)} className="year-gridline" />)}
        {values.map((value, i) => {
          const previous = values[i - 1];
          if (value === null || previous == null) return null;
          return <line key={i} x1={x(i - 1)} y1={y(previous)} x2={x(i)} y2={y(value)} className="year-segment" />;
        })}
      </svg>
      {values.map((value, i) => value !== null && <span className="year-dot" key={i}
        title={`${i + 1}º bimestre · ${formatGrade(value)}`}
        style={{ left: x(i) + "%", top: y(value) + "%" }} />)}
    </div>
  </div>;
}
