"use client";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import { db, type ClassRecord, type SchoolPeriod } from "@/lib/db";
import { importMapaoFile } from "@/lib/actions";
import { identifyCurrentPeriod, validatePeriod } from "@/lib/grade-history";
import { periodId, periodLabel, periodOrder } from "@/lib/evolution";
import { parseMapao } from "@/lib/mapao/parser";
import { exportGradePeriod } from "@/lib/mapao/exporter";
import { PeriodFields } from "./period-fields";
import { FileDrop } from "./file-drop";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

export function GradeHistoryDialog({
  cls,
  open,
  onOpenChange,
}: {
  cls: ClassRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl history-dialog">
        <DialogHeader>
          <DialogTitle>Mapões e bimestres · {cls.name}</DialogTitle>
          <DialogDescription>
            Guarde os bimestres do mesmo ano e compare as notas. O bimestre mais
            recente permanece na turma e na apresentação.
          </DialogDescription>
        </DialogHeader>
        {open && <HistoryForm cls={cls} />}
      </DialogContent>
    </Dialog>
  );
}

function HistoryForm({ cls }: { cls: ClassRecord }) {
  const periods =
    useLiveQuery(
      () => db.gradePeriods.where("classId").equals(cls.id).toArray(),
      [cls.id],
    ) ?? [];
  const [period, setPeriod] = useState<SchoolPeriod>(
    () => cls.currentPeriod ?? { year: new Date().getFullYear(), term: 1 },
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [replace, setReplace] = useState(false);
  const exists = periods.some((item) => item.id === periodId(cls.id, period));
  const changePeriod = (next: SchoolPeriod) => {
    setPeriod(next);
    setReplace(false);
    setError("");
  };
  const pick = async (files: File[]) => {
    setBusy(true);
    setFile(null);
    setError("");
    setPreview("");
    setReplace(false);
    try {
      const selected = files[0];
      if (!selected?.name.toLowerCase().endsWith(".xlsx"))
        throw new Error("Selecione um arquivo .xlsx.");
      const parsed = parseMapao(selected.name, await selected.arrayBuffer());
      if (parsed.className !== cls.id)
        throw new Error(
          `O arquivo é da turma ${parsed.className}. Selecione um mapão da turma ${cls.name}.`,
        );
      if (!parsed.students.length || !parsed.subjects.length)
        throw new Error("Nenhum aluno ativo ou disciplina foi identificado.");
      setFile(selected);
      setPreview(
        `${parsed.students.length} alunos ativos · ${parsed.subjects.length} disciplinas`,
      );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      validatePeriod(period);
      if (!cls.currentPeriod) {
        await identifyCurrentPeriod(cls.id, period);
        toast.success(`Mapão atual identificado: ${periodLabel(period)}.`);
      } else if (file) {
        const result = await importMapaoFile(file, {
          period,
          expectedClassId: cls.id,
          replace,
        });
        toast.success(
          `${periodLabel(period)} salvo${result.historical ? " no histórico" : " como mapão atual"}.`,
        );
        setFile(null);
        setPreview("");
        setReplace(false);
      }
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="history-form">
      {!cls.currentPeriod ? (
        <p className="history-notice">
          Primeiro, identifique o ano e o bimestre das notas que já estão nesta
          turma. Nenhuma nota será alterada.
        </p>
      ) : (
        <p className="history-notice">
          Mapão atual: <strong>{periodLabel(cls.currentPeriod)}</strong>.
          Importar um bimestre anterior preserva estas notas.
        </p>
      )}
      <PeriodFields
        value={period}
        onChange={changePeriod}
        disabled={busy}
        label={
          cls.currentPeriod
            ? "Período do arquivo a importar"
            : "Período das notas já cadastradas"
        }
      />
      {cls.currentPeriod && (
        <>
          <FileDrop
            multiple={false}
            disabled={busy}
            accept={{
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                [".xlsx"],
            }}
            onFiles={(files) => void pick(files)}
            label={file ? "Trocar arquivo" : "Selecionar mapão .xlsx"}
            hint={`Turma ${cls.name} · um bimestre por arquivo`}
          />
          {file && (
            <p className="history-file" role="status">
              <strong>{file.name}</strong>
              <span>
                {preview} · {periodLabel(period)}
              </span>
            </p>
          )}
          {exists && (
            <label className="check-row">
              <input
                type="checkbox"
                checked={replace}
                disabled={busy}
                onChange={(event) => setReplace(event.target.checked)}
              />
              Substituir as notas já salvas deste bimestre. Os demais bimestres
              serão mantidos.
            </label>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="attention">
          {error}
        </p>
      )}
      <Button
        onClick={save}
        disabled={
          busy || (!!cls.currentPeriod && (!file || (exists && !replace)))
        }
      >
        <Upload />
        {busy
          ? "Salvando…"
          : cls.currentPeriod
            ? "Salvar mapão do bimestre"
            : "Identificar mapão atual"}
      </Button>
      {periods.length > 0 && (
        <section aria-label="Bimestres salvos" className="saved-periods">
          <h3>Bimestres salvos</h3>
          {[...periods]
            .sort((a, b) => periodOrder(a) - periodOrder(b))
            .map((item) => (
              <div key={item.id}>
                <span>
                  <strong>{periodLabel(item)}</strong>
                  <small>
                    {item.students.length} alunos · {item.subjects.length}{" "}
                    disciplinas
                  </small>
                </span>
                <Button
                  variant="outline"
                  disabled={busy}
                  aria-label={`Exportar ${periodLabel(item)}`}
                  onClick={async () => {
                    try {
                      await exportGradePeriod(item.id);
                    } catch (cause) {
                      toast.error((cause as Error).message);
                    }
                  }}
                >
                  <Download />
                  Exportar
                </Button>
              </div>
            ))}
        </section>
      )}
    </div>
  );
}
