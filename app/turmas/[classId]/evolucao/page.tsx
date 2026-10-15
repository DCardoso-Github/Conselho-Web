"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Upload, TrendingUp } from "lucide-react";
import { db } from "@/lib/db";
import { periodOrder } from "@/lib/evolution";
import { ClassEvolutionDashboard } from "@/components/class-evolution-dashboard";
import { GradeHistoryDialog } from "@/components/grade-history-dialog";
import { Button } from "@/components/ui/button";

export default function ClassEvolutionPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId: raw } = use(params);
  const classId = decodeURIComponent(raw);
  const [history, setHistory] = useState(false);
  const data = useLiveQuery(async () => {
    const [cls, students, periods] = await Promise.all([
      db.classes.get(classId),
      db.students.where("classId").equals(classId).sortBy("order"),
      db.gradePeriods.where("classId").equals(classId).toArray(),
    ]);
    return {
      cls,
      students,
      periods: periods.sort((a, b) => periodOrder(a) - periodOrder(b)),
    };
  }, [classId]);
  if (!data)
    return <p className="empty-panel">Carregando evolução da turma…</p>;
  if (!data.cls)
    return (
      <div className="empty-panel">
        <h1>Turma não encontrada</h1>
        <Button asChild>
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    );
  return (
    <div className="console-container evolution-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Acompanhamento entre bimestres</p>
          <h1>Evolução da turma {data.cls.name}</h1>
          <p>
            Uma visão coletiva dos avanços e dos pontos que precisam de atenção.
          </p>
        </div>
        <div className="heading-actions">
          <Button asChild variant="outline">
            <Link href={`/turmas/${encodeURIComponent(classId)}`}>
              <ArrowLeft />
              Voltar à turma
            </Link>
          </Button>
          <Button onClick={() => setHistory(true)}>
            <Upload />
            Mapões e bimestres
          </Button>
        </div>
      </header>
      {data.periods.length < 2 ? (
        <div className="empty-panel">
          <TrendingUp />
          <h2>Compare dois bimestres</h2>
          <p>
            Identifique o bimestre atual e importe outro mapão do mesmo ano para
            visualizar a evolução.
          </p>
          <Button onClick={() => setHistory(true)}>Adicionar bimestres</Button>
        </div>
      ) : (
        <ClassEvolutionDashboard
          key={`${classId}:${data.periods.map((p) => p.id).join(":")}`}
          students={data.students}
          periods={data.periods}
          classId={classId}
        />
      )}
      <GradeHistoryDialog
        cls={data.cls}
        open={history}
        onOpenChange={setHistory}
      />
    </div>
  );
}
