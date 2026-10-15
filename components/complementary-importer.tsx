"use client";

import { useState } from "react";
import { FileSpreadsheet, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { FileDrop } from "./file-drop";
import { applyComplementaryImport, prepareComplementaryImport, type ComplementaryKind, type ComplementaryPreview, type ComplementaryImportResult } from "@/lib/complementary-import";

export interface ComplementaryImporterProps { classId: string; open: boolean; onOpenChange: (open: boolean) => void }

export function ComplementaryImporter({ classId, open, onOpenChange, kind }: ComplementaryImporterProps & { kind: ComplementaryKind }) {
  const [preview, setPreview] = useState<ComplementaryPreview | null>(null);
  const [targets, setTargets] = useState<string[]>([]);
  const [year, setYear] = useState("");
  const [term, setTerm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ComplementaryImportResult | null>(null);
  const pp = kind === "pp";
  const title = pp ? "Importar Prova Paulista" : "Importar Frequência e Tutor";
  const assignments = targets.flatMap((target, index) => target ? [{ index, classId: target }] : []);
  const reset = () => { setPreview(null); setTargets([]); setResult(null); setError(""); };
  const close = (next: boolean) => { if (!busy) { if (!next) reset(); onOpenChange(next); } };
  const readFile = async (files: File[]) => {
    if (!files[0] || busy) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const next = await prepareComplementaryImport(classId, files[0], kind);
      setPreview(next); setTargets(next.sheets.map(sheet => sheet.suggestedClassId));
      setYear(String(next.suggestedPeriod.year ?? new Date().getFullYear()));
      setTerm(next.suggestedPeriod.term ? String(next.suggestedPeriod.term) : "");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível ler a planilha."); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!preview || busy) return;
    setBusy(true); setError("");
    try {
      const saved = await applyComplementaryImport(preview, assignments, pp ? { year: Number(year), term: Number(term) } : undefined);
      setResult(saved);
      if (saved.matched) toast.success(`${saved.matched} alunos atualizados`);
      else setError("Nenhum aluno foi associado. Confira os nomes e as turmas selecionadas.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível importar."); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={close}>
    <DialogContent className="complementary-import-dialog" hideClose={busy} onEscapeKeyDown={event => busy && event.preventDefault()} onPointerDownOutside={event => busy && event.preventDefault()}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Uma aba por turma. Selecione o arquivo e confira o destino de cada aba antes de importar.</DialogDescription>
      </DialogHeader>
      <div className="complementary-import-body">
        {!preview ? <>
          <p className="supporting-text">{pp ? "Inclua Aluno(a), Participação, Acertos e os resultados por disciplina." : "Inclua Aluno(a), Frequência anual e/ou Tutor(a)."} Use nomes como 6A ou 7º ano B nas abas para identificar as turmas.</p>
          <FileDrop accept={{ "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] }} onFiles={readFile} label="Selecionar planilha" hint="Um arquivo .xlsx pode conter várias turmas" icon={busy ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} disabled={busy} multiple={false} />
        </> : result ? <section aria-label="Resultado da importação">
          <h3 className="import-result-heading"><CheckCircle2 aria-hidden="true" /> {result.matched} alunos atualizados</h3>
          <div className="import-sheet-list">
            {result.sheets.map(sheet => <article key={sheet.sheet}>
              <h4>{sheet.sheet} → {sheet.classId}</h4>
              <p>{sheet.matched} associados{sheet.unmatched.length ? ` · ${sheet.unmatched.length} não encontrados` : ""}</p>
              {!!sheet.unmatched.length && <details><summary>Ver alunos não encontrados</summary><ul>{sheet.unmatched.map(name => <li key={name}>{name}</li>)}</ul></details>}
            </article>)}
          </div>
          {preview.sheets.length > result.sheets.length && <p className="supporting-text">{preview.sheets.length - result.sheets.length} aba(s) ignorada(s).</p>}
        </section> : <>
          <p className="import-file-name"><FileSpreadsheet aria-hidden="true" /> {preview.fileName}</p>
          {pp && <fieldset className="import-period-fields" disabled={busy}>
            <legend>Período dos resultados</legend>
            <label>Ano<input aria-label="Ano da Prova Paulista" type="number" min="2000" max="2100" value={year} onChange={e => setYear(e.target.value)} /></label>
            <label>Bimestre<select aria-label="Bimestre da Prova Paulista" value={term} onChange={e => setTerm(e.target.value)}><option value="">Selecionar</option>{[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}º bimestre</option>)}</select></label>
            <p>Confira o período: ele vale para todas as abas selecionadas. Os resultados ficam disponíveis na evolução do aluno.</p>
          </fieldset>}
          <div className="import-sheet-list">
            {preview.sheets.map((sheet, index) => <article key={sheet.name}>
              <h3>{sheet.name}{sheet.hidden ? " · aba oculta" : ""}</h3>
              <p>{sheet.error ?? `${sheet.rows.length} alunos na planilha`}</p>
              <label>Turma de destino
                <select aria-label={`Turma da aba ${sheet.name}`} disabled={busy || !!sheet.error} value={targets[index] ?? ""} onChange={e => setTargets(old => old.map((value, i) => i === index ? e.target.value : value))}>
                  <option value="">Ignorar esta aba</option>
                  {preview.classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                </select>
              </label>
              {!sheet.error && !targets[index] && !sheet.hidden && <p className="supporting-text">Selecione uma turma cadastrada para incluir esta aba.</p>}
            </article>)}
          </div>
          <p className="supporting-text">Os nomes serão associados somente dentro da turma escolhida. {pp ? "Importar novamente o mesmo bimestre atualiza os resultados das colunas presentes." : "Somente as colunas presentes serão atualizadas."}</p>
        </>}
        {error && <p role="alert" className="attention">{error}</p>}
      </div>
      <div className="complementary-import-footer">
        <Button variant="outline" disabled={busy} onClick={preview ? reset : () => close(false)}>{preview ? "Selecionar outro arquivo" : "Cancelar"}</Button>
        {result ? <Button onClick={() => close(false)}>Concluir</Button> : preview && <Button disabled={busy || !assignments.length || (pp && (!term || !year))} onClick={save}>{busy ? "Importando…" : `Importar ${assignments.length} turma${assignments.length === 1 ? "" : "s"}`}</Button>}
      </div>
    </DialogContent>
  </Dialog>;
}
