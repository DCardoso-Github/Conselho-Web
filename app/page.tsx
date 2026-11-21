"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowUpRight, FolderOpen, GraduationCap, Plus, Search, Users } from "lucide-react";
import { useClasses } from "@/lib/hooks";
import { db } from "@/lib/db";
import { Pagination } from "@/components/pagination";
import { compactKey } from "@/lib/mapao/normalize";
import { periodLabel } from "@/lib/evolution";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PAGE_SIZE } from "@/lib/presentation";

export default function HomePage() {
  const classes = useClasses();
  const students = useLiveQuery(() => db.students.toArray(), [], []) ?? [];
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const visible = classes.filter(cls => compactKey(cls.name).includes(compactKey(query)));
  const safePage = Math.min(page, Math.max(0, Math.ceil(visible.length / PAGE_SIZE) - 1));

  if (!classes.length) return (
    <section className="focus-home">
      <div className="welcome-stage">
        <div className="welcome-copy">
          <h1>Conselho<br /><em>de classe.</em></h1>
          <p>Importe o mapão da sua turma para iniciar a reunião.</p>
          <Button asChild size="xl"><Link href="/importar"><Plus />Importar primeiro mapão</Link></Button>
          <small>Seus dados ficam neste navegador.</small>
        </div>
        <div className="folio-stage" aria-hidden="true">
          <div className="folio-sheet folio-back" /><div className="folio-sheet folio-middle" />
          <div className="folio-sheet folio-front"><GraduationCap strokeWidth={1.2} /></div>
        </div>
      </div>
    </section>
  );
  return (
    <div className="console-container focus-library">
      <header className="focus-heading">
        <div><p className="focus-label">Conselho de classe</p><h1>Escolha sua turma</h1></div>
        <Button variant="outline" asChild><Link href="/importar"><Plus />Importar mapão</Link></Button>
      </header>
      <div className="library-tools">
        <div className="search-field"><Search aria-hidden="true" /><Input type="search" aria-label="Buscar turma" placeholder="Buscar turma" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} /></div>
        <span>{classes.length} {classes.length === 1 ? "turma" : "turmas"}</span>
      </div>
      {!visible.length && <div className="empty-panel"><p role="status">Nenhuma turma encontrada.</p><Button variant="outline" onClick={() => setQuery("")}>Mostrar todas as turmas</Button></div>}
      <div className="class-library">
        {visible.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE).map(cls => {
          const count = students.filter(student => student.classId === cls.id).length;
          return <Link key={cls.id} href={`/turmas/${encodeURIComponent(cls.id)}`} className="class-choice">
            <div className="class-choice-top"><FolderOpen aria-hidden="true" /><ArrowUpRight aria-hidden="true" /></div>
            <div><p>{cls.currentPeriod ? periodLabel(cls.currentPeriod) : "Turma"}</p><h2>{cls.name}</h2></div>
            <span><Users aria-hidden="true" />{count} {count === 1 ? "aluno" : "alunos"}</span>
          </Link>;
        })}
      </div>
      <Pagination page={safePage} total={visible.length} size={PAGE_SIZE} onChange={setPage} label="Turmas" />
    </div>
  );
}
