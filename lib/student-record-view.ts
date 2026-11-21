import type { PresentationCheckpoint } from "./analysis-navigation";

const panels = ["grades", "pp", "support", "annual", "evolution", "pair-pp"] as const;
export type RecordPanel = typeof panels[number];

export function recordPanel(value: string | null | undefined, fallback: RecordPanel = "grades"): RecordPanel {
  return panels.find(panel => panel === value) ?? fallback;
}

export function recordEntry(query: Pick<URLSearchParams, "get">): PresentationCheckpoint {
  const scope = query.get("scope");
  const fallback = scope === "annual" ? "annual" : scope === "evolution" ? "evolution" : "grades";
  return {
    panel: recordPanel(query.get("panel"), fallback),
    annualYear: Number(query.get("annualYear") || query.get("year")) || undefined,
    beforeId: query.get("before") || undefined,
    afterId: query.get("after") || undefined,
    onlyLow: query.get("onlyLow") === "1",
  };
}

export function setRecordView(query: URLSearchParams, view: PresentationCheckpoint) {
  if (view.panel) query.set("panel", recordPanel(view.panel));
  if (view.annualYear) query.set("annualYear", String(view.annualYear));
  if (view.beforeId) query.set("before", view.beforeId);
  if (view.afterId) query.set("after", view.afterId);
  if (view.onlyLow) query.set("onlyLow", "1");
}
