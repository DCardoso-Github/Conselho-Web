"use client";
import { use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { AnalyticsPresentation } from "@/components/analytics-presentation";
import { Button } from "@/components/ui/button";

export default function AnalyticsPresentationPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId: raw } = use(params);
  const classId = decodeURIComponent(raw);
  const query = useSearchParams();
  const view = query.get("view") ?? "overview";
  const beforeId = query.get("before");
  const afterId = query.get("after");
  const data = useLiveQuery(async () => {
    const [cls, students, periods] = await Promise.all([
      db.classes.get(classId),
      db.students.where("classId").equals(classId).sortBy("order"),
      db.gradePeriods.where("classId").equals(classId).toArray(),
    ]);
    return { cls, students, periods };
  }, [classId]);
  if (!data) return <p className="empty-panel">Preparando apresentação…</p>;
  const before = data.periods.find((p) => p.id === beforeId);
  const after = data.periods.find((p) => p.id === afterId);
  const valid =
    view === "overview" ||
    (view === "evolution" &&
      before &&
      after &&
      before.year === after.year &&
      before.term < after.term);
  if (!data.cls || !valid)
    return (
      <div className="empty-panel">
        <h1>Apresentação indisponível</h1>
        <p>
          {!data.cls
            ? "Turma não encontrada neste navegador."
            : "Escolha dois bimestres disponíveis do mesmo ano, com o final posterior ao inicial."}
        </p>
        <Button asChild>
          <Link
            href={
              data.cls && view === "evolution"
                ? `/turmas/${encodeURIComponent(classId)}/evolucao`
                : `/turmas/${encodeURIComponent(classId)}`
            }
          >
            Voltar à turma
          </Link>
        </Button>
      </div>
    );
  return (
    <AnalyticsPresentation
      key={`${classId}:${view}:${beforeId}:${afterId}`}
      cls={data.cls}
      students={data.students}
      view={view === "evolution" ? "evolution" : "overview"}
      before={before}
      after={after}
    />
  );
}
