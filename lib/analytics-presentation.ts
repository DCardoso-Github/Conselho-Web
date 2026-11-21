export type AnalyticsView = "overview" | "evolution" | "annual";
export type AnalyticsPanel = {
  kind: string;
  title: string;
  start?: number;
  end?: number;
  subject?: string;
};

/** Small batches keep every discipline reachable without dense projection screens. */
export function analyticsPanels(
  view: AnalyticsView,
  subjectCount: number,
  provaSubjects: { subject: string; label: string }[] = [],
): AnalyticsPanel[] {
  const panels: AnalyticsPanel[] =
    view === "overview"
      ? [
          { kind: "summary", title: "Panorama da turma" },
          { kind: "distribution", title: "Distribuição das notas" },
        ]
      : view === "annual" ? [
          { kind: "year-mean", title: "Média da turma por bimestre" },
          { kind: "year-prova", title: "Prova Paulista no ano" },
        ] : [
          { kind: "mean", title: "Comparação das médias" },
          { kind: "movement", title: "Movimento da turma" },
          { kind: "low", title: "Notas vermelhas entre bimestres" },
          { kind: "pp-acertos", title: "Prova Paulista · Acertos" },
          { kind: "pp-participacao", title: "Prova Paulista · Participação" },
        ];
  if (view === "evolution") {
    if (provaSubjects.length) {
      panels.push(...provaSubjects.map(({ subject, label }) => ({
        kind: "pp-subject",
        title: `Prova Paulista · ${label}`,
        subject,
      })));
    } else {
      panels.push({ kind: "pp-subject", title: "Prova Paulista · Disciplinas" });
    }
  }
  const size = view === "annual" ? 5 : view === "overview" ? 3 : 2;
  for (let start = 0; start < subjectCount; start += size) {
    const end = Math.min(start + size, subjectCount);
    panels.push({
      kind: "subjects",
      title: "Disciplinas",
      start,
      end,
    });
  }
  return panels;
}

export function analyticsPresentationHref(
  classId: string,
  view: Exclude<AnalyticsView, "annual">,
  before?: string,
  after?: string,
) {
  const query = new URLSearchParams({ view });
  if (view === "evolution" && before && after) {
    query.set("before", before);
    query.set("after", after);
  }
  return `/turmas/${encodeURIComponent(classId)}/apresentar-paineis?${query}`;
}
