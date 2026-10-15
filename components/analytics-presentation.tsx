"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  X,
  Users,
  ChartColumn,
  AlertTriangle,
} from "lucide-react";
import type { ClassRecord, GradePeriodRecord, StudentRecord } from "@/lib/db";
import { classOverview, classEvolution, classProvaEvolution } from "@/lib/class-analytics";
import { ClassProvaChart } from "./class-prova-chart";
import {
  analyticsPanels,
  type AnalyticsView,
} from "@/lib/analytics-presentation";
import { comparePeriods, formatGain, periodLabel } from "@/lib/evolution";
import { formatSubject } from "@/lib/mapao/subjects";
import {
  Distribution,
  PairedBars,
  StatCard,
  gradeLabel,
} from "./analytics-primitives";
import { SubjectIcon } from "./subject-icon";
import { Button } from "./ui/button";

export function AnalyticsPresentation({
  cls,
  students,
  view,
  before,
  after,
}: {
  cls: ClassRecord;
  students: StudentRecord[];
  view: AnalyticsView;
  before?: GradePeriodRecord;
  after?: GradePeriodRecord;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [full, setFull] = useState(false);
  const [message, setMessage] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const overview = classOverview(students, cls.subjects);
  const comparisons = comparePeriods(students, before, after);
  const evolution = classEvolution(comparisons);
  const prova = classProvaEvolution(students, before, after);
  const subjects = [...overview.rows].sort(
    (a, b) => b.low - a.low || a.subject.localeCompare(b.subject, "pt-BR"),
  );
  const panels = analyticsPanels(
    view,
    view === "overview" ? subjects.length : evolution.subjects.length,
  );
  const safeIndex = Math.min(index, panels.length - 1);
  const panel = panels[safeIndex];
  const context =
    view === "overview"
      ? cls.currentPeriod
        ? periodLabel(cls.currentPeriod)
        : "Notas atuais"
      : `${periodLabel(before!)} → ${periodLabel(after!)}`;
  const leave = useCallback(() => {
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    const base = `/turmas/${encodeURIComponent(cls.id)}`;
    const query = new URLSearchParams({
      before: before?.id ?? "",
      after: after?.id ?? "",
    });
    router.push(
      view === "overview"
        ? `${base}?view=overview`
        : `${base}/evolucao?${query}`,
    );
  }, [router, cls.id, view, before?.id, after?.id]);
  useEffect(() => {
    const update = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [safeIndex]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        document.querySelector(
          '[role="dialog"], [role="alertdialog"], [role="menu"]',
        )
      )
        return;
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('input,textarea,select,[contenteditable="true"]')
      )
        return;
      if (event.key === "Escape") {
        if (!document.fullscreenElement) leave();
        return;
      }
      const next = event.key === "ArrowRight" || event.key === "PageDown";
      const previous = event.key === "ArrowLeft" || event.key === "PageUp";
      if (next || previous || event.key === "Home" || event.key === "End") {
        event.preventDefault();
        setIndex((i) =>
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? panels.length - 1
              : Math.max(0, Math.min(panels.length - 1, i + (next ? 1 : -1))),
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panels.length, leave]);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setMessage("");
    } catch {
      setMessage(
        "Tela cheia indisponível. A apresentação continua funcionando nesta janela.",
      );
    }
  };
  let content: ReactNode;
  let note = "";
  if (view === "overview") {
    if (panel.kind === "summary") {
      content = (
        <div className="projection-stats">
          <StatCard
            icon={<Users />}
            label="Alunos na turma"
            value={students.length}
            detail={`${cls.subjects.length} disciplinas cadastradas`}
          />
          <StatCard
            icon={<ChartColumn />}
            label="Média das notas"
            value={gradeLabel(overview.average)}
            detail="Escala de 0 a 10"
          />
          <StatCard
            icon={<AlertTriangle />}
            label="Com notas vermelhas"
            value={overview.withLow}
            detail="Alunos com pelo menos uma nota de 0 a 4"
            tone="stat-attention"
          />
        </div>
      );
    } else if (panel.kind === "distribution") {
      content = overview.count ? (
        <Distribution
          label="Distribuição das notas da turma"
          total={overview.count}
          items={[
            {
              label: "0 a 4 · notas vermelhas",
              count: overview.bands[0],
              tone: "tone-low",
            },
            {
              label: "Acima de 4 e abaixo de 7",
              count: overview.bands[1],
              tone: "tone-mid",
            },
            { label: "7 a 10", count: overview.bands[2], tone: "tone-high" },
          ]}
        />
      ) : (
        <Empty>Sem dados para gerar o gráfico.</Empty>
      );
    } else {
      content = (
        <div className="projection-subjects">
          {subjects.slice(panel.start, panel.end).map((row) => (
            <article className="projection-subject" key={row.subject}>
              <h2>
                <SubjectIcon name={row.subject} />
                {formatSubject(row.subject)}
              </h2>
              <div className="projection-score">
                <span>Média</span>
                <strong>{gradeLabel(row.average)}</strong>
              </div>
              <p className={row.low ? "negative" : ""}>
                {row.count
                  ? `${row.low} ${row.low === 1 ? "nota vermelha" : "notas vermelhas"}`
                  : "Sem informação"}
              </p>
              <div className="bar-track" aria-hidden="true">
                <i
                  className="tone-low"
                  style={{
                    width: `${students.length ? (row.low / students.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      );
      note =
        "Disciplinas ordenadas por quantidade de notas vermelhas. Barras proporcionais ao total de alunos da turma.";
    }
  } else {
    if (panel.kind === "mean") {
      content =
        evolution.before === null || evolution.after === null ? (
          <Empty>Sem dados para comparar os bimestres escolhidos.</Empty>
        ) : (
          <div className="projection-mean">
            <Legend before={before!} after={after!} />
            <PairedBars
              label="Média da turma"
              before={evolution.before}
              after={evolution.after}
            />
            <div className="chart-scale" aria-hidden="true">
              <span>0</span>
              <span>5</span>
              <span>10</span>
            </div>
            <p className="projection-gain">
              Variação{" "}
              <strong
                className={
                  evolution.gain! > 0
                    ? "positive"
                    : evolution.gain! < 0
                      ? "negative"
                      : ""
                }
              >
                {formatGain(evolution.gain!)} pontos
              </strong>
            </p>
          </div>
        );
    } else if (panel.kind === "movement") {
      content = students.length ? (
        <Distribution
          label="Movimento da turma"
          total={students.length}
          items={[
            {
              label: "Melhoraram a média",
              count: evolution.improved,
              tone: "tone-high",
            },
            {
              label: "Mantiveram a média",
              count: evolution.stable,
              tone: "tone-mid",
            },
            {
              label: "Reduziram a média",
              count: evolution.declined,
              tone: "tone-low",
            },
            {
              label: "Sem comparação",
              count: students.length - comparisons.length,
              tone: "tone-missing",
            },
          ]}
        />
      ) : (
        <Empty>Nenhum aluno cadastrado nesta turma.</Empty>
      );
      note = `Distribuição dos ${students.length} alunos atuais.`;
    } else if (panel.kind === "low") {
      content = (
        <div className="projection-stats two">
          <StatCard
            icon={<AlertTriangle />}
            label={`Inicial · ${before!.term}º bimestre`}
            value={evolution.pairCount ? evolution.lowBefore : "Sem informação"}
            detail="Notas de 0 a 4"
          />
          <StatCard
            icon={<AlertTriangle />}
            label={`Final · ${after!.term}º bimestre`}
            value={evolution.pairCount ? evolution.lowAfter : "Sem informação"}
            detail="Notas de 0 a 4"
          />
        </div>
      );
    } else if (panel.kind === "pp-acertos" || panel.kind === "pp-participacao") {
      const acertos = panel.kind === "pp-acertos";
      content = (
        <div className="projection-mean">
          <ClassProvaChart
            data={acertos ? prova.acertos : prova.participacao}
            label={acertos ? "Acertos" : "Participação"}
            before={before!}
            after={after!}
          />
        </div>
      );
      note = "Variação em pontos percentuais (p.p.). Dados ausentes ficam fora da comparação.";
    } else {
      content = (
        <div className="projection-subjects two">
          {evolution.subjects.slice(panel.start, panel.end).map((row) => (
            <article className="projection-subject" key={row.subject}>
              <h2>
                <SubjectIcon name={row.subject} />
                {formatSubject(row.subject)}
              </h2>
              <div className="chart-legend">
                <span>
                  <i className="bar-before" />
                  Inicial
                </span>
                <span>
                  <i className="bar-after" />
                  Final
                </span>
              </div>
              <PairedBars
                label={formatSubject(row.subject)}
                before={row.before}
                after={row.after}
              />
              <p
                className={
                  row.gain > 0 ? "positive" : row.gain < 0 ? "negative" : ""
                }
              >
                {formatGain(row.gain)} pontos
              </p>
            </article>
          ))}
        </div>
      );
      note =
        "Médias na escala de 0 a 10. Disciplinas ordenadas pela variação.";
    }
  }
  return (
    <section className="analytics-presentation">
      <header className="projection-header">
        <div>
          <span className="eyebrow">
            {view === "overview" ? "Visão geral" : "Evolução da turma"} ·{" "}
            {cls.name}
          </span>
          <p>{context}</p>
        </div>
        <div className="presentation-actions">
          <Button variant="outline" onClick={toggleFullscreen}>
            {full ? <Minimize /> : <Maximize />}
            {full ? "Sair da tela cheia" : "Tela cheia"}
          </Button>
          <Button
            variant="ghost"
            onClick={leave}
            aria-label="Sair da apresentação dos painéis"
          >
            <X />
            Sair
          </Button>
        </div>
      </header>
      {message && (
        <p role="status" className="projection-message">
          {message}
        </p>
      )}
      <div className="projection-title">
        <h1 tabIndex={-1} ref={titleRef}>
          {panel.title}
        </h1>
      </div>
      <section
        key={`${panel.kind}:${panel.start ?? 0}`}
        className="projection-stage"
        aria-label={panel.title}
        tabIndex={0}
      >
        {content}
      </section>
      {note && <p className="projection-note">{note}</p>}
      <footer className="projection-footer">
        <label className="projection-jump">
          Ir para painel
          <select
            aria-label="Ir para painel"
            value={safeIndex}
            onChange={(e) => setIndex(Number(e.target.value))}
          >
            {panels.map((item, i) => (
              <option key={`${item.kind}:${i}`} value={i}>
                {i + 1}. {item.title}
              </option>
            ))}
          </select>
        </label>
        <div className="student-navigation">
          <Button
            variant="outline"
            disabled={safeIndex === 0}
            onClick={() => setIndex(safeIndex - 1)}
          >
            <ChevronLeft />
            Anterior
          </Button>
          <span role="status" aria-live="polite" aria-atomic="true">
            <strong>{safeIndex + 1}</strong> / {panels.length}
            <span className="sr-only"> · {panel.title}</span>
          </span>
          <Button
            disabled={safeIndex === panels.length - 1}
            onClick={() => setIndex(safeIndex + 1)}
          >
            Próximo
            <ChevronRight />
          </Button>
        </div>
        <span className="projection-shortcuts">← → navegar · Esc sair</span>
      </footer>
    </section>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return <p className="projection-empty">{children}</p>;
}
function Legend({
  before,
  after,
}: {
  before: GradePeriodRecord;
  after: GradePeriodRecord;
}) {
  return (
    <div className="chart-legend">
      <span>
        <i className="bar-before" />
        {periodLabel(before)}
      </span>
      <span>
        <i className="bar-after" />
        {periodLabel(after)}
      </span>
    </div>
  );
}
