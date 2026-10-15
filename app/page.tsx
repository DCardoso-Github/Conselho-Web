"use client";
import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowUpRight,
  GraduationCap,
  Plus,
  Users,
  AlertTriangle,
} from "lucide-react";
import { useClasses } from "@/lib/hooks";
import { db } from "@/lib/db";
import { hasLowGrades, PAGE_SIZE } from "@/lib/presentation";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
export default function HomePage() {
  const classes = useClasses();
  const students = useLiveQuery(() => db.students.toArray(), [], []) ?? [];
  const [page, setPage] = useState(0);
  const safePage = Math.min(
    page,
    Math.max(0, Math.ceil(classes.length / PAGE_SIZE) - 1),
  );
  if (!classes.length)
    return (
      <section className="welcome-screen">
        <div className="welcome-emblem">
          <GraduationCap />
        </div>
        <p className="eyebrow">Conselho de classe</p>
        <h1>
          Um aluno por vez.
          <br />
          <span>Mais espaço para decidir.</span>
        </h1>
        <p>Importe o mapão e prepare o encontro da sua turma.</p>
        <Button asChild size="xl">
          <Link href="/importar">
            <Plus /> Importar primeiro mapão
          </Link>
        </Button>
        <p className="supporting-text">
          Dados armazenados apenas neste navegador.
        </p>
      </section>
    );
  return (
    <div className="console-container">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Conselho de classe</p>
          <h1>Escolha sua turma</h1>
          <p>
            {classes.length} turmas · {students.length} alunos
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/importar">
            <Plus /> Importar mapão
          </Link>
        </Button>
      </header>
      <div className="selection-grid">
        {classes
          .slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
          .map((cls) => {
            const members = students.filter(
              (student) => student.classId === cls.id,
            );
            const low = members.filter(hasLowGrades).length;
            return (
              <Link
                key={cls.id}
                href={`/turmas/${encodeURIComponent(cls.id)}`}
                className="class-tile"
              >
                <div className="tile-top">
                  <span className="eyebrow">Turma</span>
                  <ArrowUpRight />
                </div>
                <h2>{cls.name}</h2>
                <div className="tile-stat">
                  <Users /> <strong>{members.length}</strong> alunos
                </div>
                <div className={low ? "tile-note attention" : "tile-note"}>
                  <AlertTriangle /> {low} com notas vermelhas
                </div>
                <span className="tile-action">
                  Abrir turma <span aria-hidden="true">→</span>
                </span>
              </Link>
            );
          })}
      </div>
      <Pagination
        page={safePage}
        total={classes.length}
        size={PAGE_SIZE}
        onChange={setPage}
        label="Turmas"
      />
    </div>
  );
}
