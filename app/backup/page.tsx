"use client";
import {useState} from "react";
import {useClasses} from "@/lib/hooks";
import {writeBackup,readBackup,restoreBackup,downloadFile} from "@/lib/backup";
import {Button} from "@/components/ui/button";
import {ConfirmDialog} from "@/components/confirm-dialog";
import {periodLabel} from "@/lib/evolution";
export default function Backup(){const classes=useClasses(),[pack,set]=useState<Awaited<ReturnType<typeof readBackup>>>(),[ids,choose]=useState<string[]>([]),[confirm,ask]=useState(false),[busy,lock]=useState(false),[message,msg]=useState("");
 const run=async(fn:()=>Promise<void>)=>{lock(true);msg("");try{await fn()}catch(e){msg((e as Error).message)}finally{lock(false)}};
 return <main className="console-container council-work"><header className="page-heading"><div><p className="eyebrow">Neste navegador</p><h1>Backup e restauração</h1><p>Leve as turmas, fotos e reuniões para outro computador.</p></div></header>
 <section><h2>Guardar uma cópia</h2><p>{classes.length} turmas no navegador</p><Button disabled={busy||!classes.length} onClick={()=>run(async()=>{const bytes=await writeBackup();downloadFile(new Blob([new Uint8Array(bytes)],{type:"application/zip"}),"Conselho-backup.zip");msg("Cópia preparada para download.")})}>Baixar backup completo</Button></section>
 <section><h2>Restaurar turmas</h2><label>Selecionar backup ZIP <input type="file" accept=".zip" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value="";set(undefined);choose([]);if(file)void run(async()=>set(await readBackup(await file.arrayBuffer())))}}/></label>
 {pack&&<><p>Escolha quais turmas restaurar. As demais ficam como estão.</p>{pack.data.classes.map(c=><label key={c.id} className="check-row"><input type="checkbox" checked={ids.includes(c.id)} onChange={e=>choose(e.target.checked?[...ids,c.id]:ids.filter(i=>i!==c.id))}/><span>{c.name} · {classes.some(x=>x.id===c.id)?"Substituir":"Incluir"} · {pack.data.periods.filter(x=>x.classId===c.id).map(periodLabel).join(", ")||"Bimestre não identificado"}</span></label>)}<Button disabled={!ids.length||busy} onClick={()=>ask(true)}>Restaurar seleção</Button></>}</section>
 <p role="status">{message}</p><ConfirmDialog open={confirm} onOpenChange={ask} title="Restaurar turmas selecionadas?" description={ids.join(", ")+" — os dados locais dessas turmas serão substituídos pelos do arquivo."} confirmLabel="Confirmar restauração" onConfirm={()=>run(async()=>{if(pack)await restoreBackup(pack,ids);set(undefined);choose([]);msg("Turmas restauradas.")})}/></main>}

