"use client";

import { useState } from "react";
import { ArrowLeft, ArrowUpRight, Download, Upload } from "lucide-react";
import { useClasses } from "@/lib/hooks";
import { writeBackup, readBackup, restoreBackup, downloadFile } from "@/lib/backup";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { periodLabel } from "@/lib/evolution";

export default function Backup() {
  const classes = useClasses();
  const [mode, setMode] = useState<"export" | "restore" | null>(null);
  const [pack, setPack] = useState<Awaited<ReturnType<typeof readBackup>>>();
  const [ids, setIds] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try { await action(); }
    catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  function goBack() {
    setMode(null);
    setPack(undefined);
    setIds([]);
    setMessage("");
  }

  return <div className="console-container focus-library">
    <header className="focus-heading"><div>
      {mode && <button type="button" disabled={busy} className="focus-back" onClick={goBack}><ArrowLeft />Backup e restauração</button>}
      <h1>{mode === "export" ? "Exportar backup" : mode === "restore" ? "Restaurar turmas" : "Backup e restauração"}</h1>
    </div></header>
    {!mode && <div className="destination-choices">
      <button onClick={() => setMode("export")}><Download /><strong>Exportar</strong><ArrowUpRight /></button>
      <button onClick={() => setMode("restore")}><Upload /><strong>Restaurar</strong><ArrowUpRight /></button>
    </div>}
    {mode === "export" && <section className="backup-step">
      <p>{classes.length ? `O arquivo reúne as ${classes.length} turma(s) deste navegador, incluindo fotos e reuniões.` : "Importe uma turma para criar um backup."}</p>
      <Button size="lg" disabled={busy || !classes.length} onClick={() => run(async () => {
        const bytes = await writeBackup();
        downloadFile(new Blob([new Uint8Array(bytes)], {type:"application/zip"}), "Conselho-backup.zip");
        setMessage("Cópia preparada para download.");
      })}><Download />Baixar backup completo</Button>
    </section>}
    {mode === "restore" && <section className="backup-step">
      <label className="backup-upload">Selecionar backup ZIP
        <input type="file" accept=".zip" disabled={busy} onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = "";
          setPack(undefined);
          setIds([]);
          if (file) void run(async () => setPack(await readBackup(await file.arrayBuffer())));
        }} />
      </label>
      {pack && <fieldset disabled={busy}><legend>Escolha as turmas para restaurar</legend>
        {pack.data.classes.map(cls => <label key={cls.id} className="check-row">
          <input type="checkbox" checked={ids.includes(cls.id)} onChange={e => setIds(e.target.checked ? [...ids, cls.id] : ids.filter(id => id !== cls.id))} />
          <span>{cls.name} · {classes.some(item => item.id === cls.id) ? "Substituir" : "Incluir"} · {pack.data.periods.filter(p => p.classId === cls.id).map(periodLabel).join(", ") || "Bimestre não identificado"}</span>
        </label>)}
        <Button size="lg" disabled={!ids.length || busy} onClick={() => setConfirm(true)}>Restaurar seleção</Button>
      </fieldset>}
    </section>}
    <p className="backup-status" role="status">{message}</p>
    <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Restaurar turmas selecionadas?"
      description={ids.join(", ") + " — os dados locais dessas turmas serão substituídos pelos do arquivo."}
      confirmLabel="Confirmar restauração" onConfirm={() => run(async () => {
        if (pack) await restoreBackup(pack, ids);
        setPack(undefined);
        setIds([]);
        setMessage("Turmas restauradas.");
      })} />
  </div>;
}
