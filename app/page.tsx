"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { toast } from "sonner";
import NumberFlow from "@number-flow/react";
import {
  Download,
  Trash2,
  Upload,
  GraduationCap,
  ArrowRight,
  MoreVertical,
  CalendarDays,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useClasses } from "@/lib/hooks";
import { db } from "@/lib/db";
import { deleteClass, isLowGrade } from "@/lib/actions";
import { exportClassToXlsx } from "@/lib/mapao/exporter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function HomePage() {
  const classes = useClasses();
  const allStudents =
    useLiveQuery(() => db.students.toArray(), [], []) ?? [];

  const totals = React.useMemo(() => {
    const studentsByClass = new Map<string, number>();
    const lowByClass = new Map<string, number>();
    let totalStudents = 0;
    let totalLow = 0;
    for (const s of allStudents) {
      studentsByClass.set(s.classId, (studentsByClass.get(s.classId) ?? 0) + 1);
      const hasLow = Object.values(s.grades).some((g) => isLowGrade(g));
      if (hasLow) {
        lowByClass.set(s.classId, (lowByClass.get(s.classId) ?? 0) + 1);
        totalLow++;
      }
      totalStudents++;
    }
    return { studentsByClass, lowByClass, totalStudents, totalLow };
  }, [allStudents]);

  if (classes.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <section>
        <div className="flex items-end justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Turmas</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {classes.length} turma{classes.length === 1 ? "" : "s"} · {totals.totalStudents} aluno{totals.totalStudents === 1 ? "" : "s"}
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/importar">
              <Upload /> Importar mapão
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {classes.map((c, i) => (
            <ClassCard
              key={c.id}
              id={c.id}
              name={c.name}
              subjects={c.subjects.length}
              importedAt={c.importedAt}
              students={totals.studentsByClass.get(c.id) ?? 0}
              low={totals.lowByClass.get(c.id) ?? 0}
              index={i}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="grid size-20 place-items-center rounded-3xl bg-primary/10 text-primary mx-auto mb-6"
      >
        <GraduationCap className="size-10" />
      </motion.div>
      <h1 className="h-hero text-4xl sm:text-5xl mb-4">
        Comece importando um mapão
      </h1>
      <p className="text-muted-foreground mb-8">
        Os dados ficam armazenados apenas no seu navegador. Nada vai para a
        internet.
      </p>
      <Button asChild size="xl">
        <Link href="/importar">
          <Upload /> Importar mapão (.xlsx)
        </Link>
      </Button>
    </div>
  );
}

function StatPill(_: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  tone?: "danger";
  asLink?: string;
}) {
  return null;
}
void StatPill;

function ClassCard({
  id,
  name,
  subjects,
  importedAt,
  students,
  low,
  index,
}: {
  id: string;
  name: string;
  subjects: number;
  importedAt: number;
  students: number;
  low: number;
  index: number;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmOpen(true);
  };
  const doDelete = async () => {
    await deleteClass(id);
    toast.info(`Turma "${id}" excluída.`);
  };
  const handleExport = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await exportClassToXlsx(id);
      toast.success(`Planilha de "${id}" exportada.`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.04, 0.3),
        duration: 0.32,
        ease: [0.2, 0.8, 0.2, 1],
      }}
    >
      <Link
        href={`/turmas/${encodeURIComponent(id)}`}
        className="group block"
      >
        <Card className="relative overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all duration-300 group-hover:-translate-y-0.5">
          <div className="absolute -right-8 -top-8 size-32 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors" />
          <CardContent className="p-5 relative">
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  Turma
                </div>
                <div className="text-3xl font-extrabold text-foreground tracking-tight">
                  {name}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Mais opções para turma ${name}`}
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExport}>
                    <Download /> Exportar planilha
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 /> Excluir turma
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <Stat label="Alunos" value={students} />
              <Stat label="Vermelhas" value={low} tone={low > 0 ? "danger" : undefined} />
              <Stat label="Disc." value={subjects} />
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3" />
                {new Date(importedAt).toLocaleDateString("pt-BR")}
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Abrir <ArrowRight className="size-3" />
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Excluir turma "${id}"?`}
        description="Todos os alunos, notas, fotos e anotações serão removidos permanentemente."
        confirmLabel="Excluir"
        onConfirm={doDelete}
      />
    </motion.div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "danger";
}) {
  return (
    <div className="rounded-lg bg-muted/60 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </div>
      <div
        className={
          tone === "danger"
            ? "text-base font-bold tabular-nums text-destructive"
            : "text-base font-bold tabular-nums text-foreground"
        }
      >
        <NumberFlow value={value} />
      </div>
    </div>
  );
}
