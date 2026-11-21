"use client";
import { useState } from "react";
import { Check, ListOrdered, Search } from "lucide-react";
import type { StudentRecord } from "@/lib/db";
import { nameKey } from "@/lib/evolution";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

export function StudentJump({ students, current, onChoose }: {
  students: StudentRecord[]; current: number; onChoose: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const matches = students.map((student, index) => ({ student, index }))
    .filter(({ student }) => nameKey(student.name).includes(nameKey(query)));
  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) setQuery(""); }}>
    <DialogTrigger asChild>
      <Button variant="outline" className="jump-counter" aria-label={`Escolher aluno: ${current + 1} de ${students.length}`} title="Escolher aluno na sequência">
        <ListOrdered aria-hidden="true" /><span>Ir para aluno</span><strong>{current + 1} / {students.length}</strong>
      </Button>
    </DialogTrigger>
    <DialogContent className="sequence-dialog">
      <DialogHeader><DialogTitle>Ir para aluno</DialogTitle>
        <DialogDescription>Escolha o aluno cuja ficha deseja abrir.</DialogDescription>
      </DialogHeader>
      <div className="search-field"><Search aria-hidden="true"/><Input aria-label="Buscar na sequência" placeholder="Nome do aluno…" value={query} onChange={e => setQuery(e.target.value)} /></div>
      <ol aria-label="Alunos na sequência" className="sequence-results">
        {matches.map(({ student, index }) => <li key={student.id}>
          <button type="button" aria-current={index === current ? "true" : undefined} onClick={() => { onChoose(index); setOpen(false); setQuery(""); }}>
            <span className="sequence-position">{index + 1}</span><span>{student.name}</span>{index === current && <Check aria-label="Aluno atual" />}
          </button>
        </li>)}
      </ol>
      {!matches.length && <p role="status">Nenhum aluno encontrado nesta sequência.</p>}
    </DialogContent>
  </Dialog>;
}
