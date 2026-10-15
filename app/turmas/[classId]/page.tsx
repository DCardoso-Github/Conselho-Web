"use client";
import { use, useState, useDeferredValue } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import * as Tabs from "@radix-ui/react-tabs";
import { toast } from "sonner";
import {
  Play,
  Settings2,
  Search,
  SlidersHorizontal,
  Upload,
  Image as ImageIcon,
  FileText,
  Download,
  Trash2,
  Users,
  Star,
  TrendingUp,
} from "lucide-react";
import { db } from "@/lib/db";
import { deleteClass, isLowGrade } from "@/lib/actions";
import { hasLowGrades, hasValue } from "@/lib/presentation";
import { formatSubject } from "@/lib/mapao/subjects";
import { exportClassToXlsx } from "@/lib/mapao/exporter";
import { StudentGrid, type StudentSort } from "@/components/student-card";
import { GradeHistoryDialog } from "@/components/grade-history-dialog";
import { StudentEvolution } from "@/components/student-evolution";
import { periodLabel } from "@/lib/evolution";
import { StudentHighlights } from "@/components/student-highlights";
import { ClassDashboard } from "@/components/class-dashboard";
import { PhotoImporter } from "@/components/photo-importer";
import { ProvaPaulistaImporter } from "@/components/prova-paulista-importer";
import { FrequenciaTutorImporter } from "@/components/frequencia-tutor-importer";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export default function TurmaPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId: raw } = use(params);
  const classId = decodeURIComponent(raw);
  const router = useRouter();
  const query = useSearchParams();
  const data = useLiveQuery(
    async () => ({
      cls: await db.classes.get(classId),
      students: await db.students
        .where("classId")
        .equals(classId)
        .sortBy("order"),
    }),
    [classId],
  );
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [onlyLow, setOnlyLow] = useState(false);
  const [redSubject, setRedSubject] = useState<string | null>(null);
  const [sort, setSort] = useState<StudentSort>("order");
  const [filters, setFilters] = useState(false);
  const [manage, setManage] = useState(false);
  const [history, setHistory] = useState(false);
  const [start, setStart] = useState(false);
  const [scope, setScope] = useState<"all" | "low">("all");
  const [importer, setImporter] = useState<"photo" | "pp" | "frequency" | null>(
    null,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exporting, setExporting] = useState(false);
  const clear = () => {
    setSearch("");
    setOnlyLow(false);
    setRedSubject(null);
    setSort("order");
  };
  if (!data) return <p className="empty-panel">Carregando turma…</p>;
  if (!data.cls)
    return (
      <div className="empty-panel">
        <h1>Turma não encontrada</h1>
        <Button onClick={() => router.push("/")}>Voltar ao início</Button>
      </div>
    );
  const { cls, students } = data;
  const low = students.filter(hasLowGrades).length;
  const filterCount =
    Number(onlyLow || !!redSubject) + Number(sort !== "order");
  const runExport = async (pdf: boolean) => {
    setExporting(true);
    try {
      if (pdf)
        await (await import("@/lib/exportPdf")).exportClassToPdf(classId);
      else await exportClassToXlsx(classId);
      toast.success(pdf ? "PDF exportado." : "Planilha exportada.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setExporting(false);
    }
  };
  const openImporter = (type: "photo" | "pp" | "frequency") => {
    setManage(false);
    setImporter(type);
  };
  return (
    <div className="console-container">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Sua turma</p>
          <h1>{cls.name}</h1>
          <p>
            {students.length} alunos · {cls.subjects.length} disciplinas
            {cls.currentPeriod && ` · ${periodLabel(cls.currentPeriod)}`}
          </p>
        </div>
        <div className="heading-actions">
          <Button asChild variant="outline"><Link href={`/turmas/${encodeURIComponent(classId)}/evolucao`}><TrendingUp />Evolução da turma</Link></Button>
          <Button variant="outline" onClick={() => setManage(true)}>
            <Settings2 /> Gerenciar turma
          </Button>
          <Button
            size="lg"
            disabled={!students.length}
            onClick={() => {
              setScope("all");
              setStart(true);
            }}
          >
            <Play /> Iniciar conselho
          </Button>
        </div>
      </header>
      <Tabs.Root defaultValue={query.get("view") === "overview" ? "overview" : "students"}>
        <Tabs.List className="section-tabs" aria-label="Visualização da turma">
          <Tabs.Trigger value="students">Alunos</Tabs.Trigger>
          <Tabs.Trigger value="highlights">
            <Star aria-hidden="true" /> Alunos destaque
          </Tabs.Trigger>
          <Tabs.Trigger value="evolution">
            <TrendingUp aria-hidden="true" />
            Alunos evolução
          </Tabs.Trigger>
          <Tabs.Trigger value="overview">Visão geral</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="students">
          <div className="search-toolbar">
            <div className="search-field">
              <Search />
              <Input
                aria-label="Buscar aluno"
                placeholder="Buscar aluno pelo nome…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => setFilters(true)}>
              <SlidersHorizontal /> Filtros
              {filterCount ? ` (${filterCount})` : ""}
            </Button>
          </div>
          {(onlyLow || redSubject || sort !== "order") && (
            <div className="active-filters" role="status">
              <span>
                {redSubject
                  ? `Notas vermelhas em ${formatSubject(redSubject)}`
                  : onlyLow
                    ? "Só alunos com notas vermelhas"
                    : ""}
                {sort !== "order"
                  ? ` · ${sort === "name" ? "Nome A–Z" : "Mais notas vermelhas"}`
                  : ""}
              </span>
              <Button variant="ghost" onClick={clear}>
                Limpar filtros
              </Button>
            </div>
          )}
          <StudentGrid
            classId={classId}
            search={deferredSearch}
            onlyLow={onlyLow}
            redSubject={redSubject}
            sort={sort}
            onClearFilters={clear}
          />
        </Tabs.Content>
        <Tabs.Content value="highlights">
          <StudentHighlights
            students={students}
            subjects={cls.subjects}
            classId={classId}
          />
        </Tabs.Content>
        <Tabs.Content value="evolution">
          <StudentEvolution
            cls={cls}
            students={students}
            onImport={() => setHistory(true)}
          />
        </Tabs.Content>
        <Tabs.Content value="overview">
          <ClassDashboard students={students} subjects={cls.subjects} classId={classId} />
        </Tabs.Content>
      </Tabs.Root>
      <Dialog open={filters} onOpenChange={setFilters}>
        <DialogContent className="filter-dialog">
          <DialogHeader>
            <DialogTitle>Filtrar alunos</DialogTitle>
            <DialogDescription>
              Os filtros consideram todos os alunos da turma.
            </DialogDescription>
          </DialogHeader>
          <label className="check-row">
            <input
              type="checkbox"
              checked={onlyLow}
              onChange={(event) => {
                setOnlyLow(event.target.checked);
                setRedSubject(null);
              }}
            />{" "}
            Apenas com notas vermelhas
          </label>
          <label className="form-field">
            Nota vermelha em
            <select
              value={redSubject ?? ""}
              onChange={(event) => {
                setRedSubject(event.target.value || null);
                setOnlyLow(false);
              }}
            >
              <option value="">Todas as disciplinas</option>
              {cls.subjects
                .filter((subject) =>
                  students.some(
                    (student) =>
                      hasValue(student.grades[subject]) &&
                      isLowGrade(student.grades[subject]),
                  ),
                )
                .map((subject) => (
                  <option key={subject} value={subject}>
                    {formatSubject(subject)}
                  </option>
                ))}
            </select>
          </label>
          <label className="form-field">
            Ordenação
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as StudentSort)}
            >
              <option value="order">Ordem original</option>
              <option value="name">Nome (A–Z)</option>
              <option value="redCount">Mais notas vermelhas</option>
            </select>
          </label>
          <Button onClick={() => setFilters(false)}>Ver alunos</Button>
        </DialogContent>
      </Dialog>
      <Dialog open={start} onOpenChange={setStart}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quem vamos apresentar?</DialogTitle>
            <DialogDescription>
              Escolha os alunos para o conselho da turma {cls.name}.
            </DialogDescription>
          </DialogHeader>
          <fieldset className="scope-choices">
            <legend className="sr-only">Alunos da apresentação</legend>
            <label
              className={
                scope === "all" ? "scope-choice selected" : "scope-choice"
              }
            >
              <input
                type="radio"
                name="scope"
                value="all"
                checked={scope === "all"}
                onChange={() => setScope("all")}
              />
              <Users />
              <span>
                Todos os alunos<strong>{students.length}</strong>
              </span>
            </label>
            <label
              className={
                scope === "low" ? "scope-choice selected" : "scope-choice"
              }
            >
              <input
                type="radio"
                name="scope"
                value="low"
                checked={scope === "low"}
                disabled={!low}
                onChange={() => setScope("low")}
              />
              <span>
                Com notas vermelhas<strong>{low}</strong>
              </span>
            </label>
          </fieldset>
          <Button
            size="lg"
            onClick={() =>
              router.push(
                `/turmas/${encodeURIComponent(classId)}/apresentar?scope=${scope}`,
              )
            }
          >
            <Play /> Começar apresentação
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={manage} onOpenChange={setManage}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerenciar turma {cls.name}</DialogTitle>
            <DialogDescription>
              Importada em{" "}
              {new Date(cls.importedAt).toLocaleDateString("pt-BR")}. Atualize
              os dados ou exporte os resultados.
            </DialogDescription>
          </DialogHeader>
          <div className="management-grid">
            <Button
              variant="outline"
              onClick={() => {
                setManage(false);
                setHistory(true);
              }}
            >
              <Upload />
              Mapões e bimestres
            </Button>
            <Button variant="outline" onClick={() => openImporter("photo")}>
              <ImageIcon aria-hidden="true" /> Fotos dos alunos
            </Button>
            <Button variant="outline" onClick={() => openImporter("pp")}>
              <Upload /> Prova Paulista
            </Button>
            <Button variant="outline" onClick={() => openImporter("frequency")}>
              <Upload /> Frequência/Tutor
            </Button>
            <Button
              variant="outline"
              disabled={exporting}
              onClick={() => runExport(false)}
            >
              <Download /> Exportar planilha
            </Button>
            <Button
              variant="outline"
              disabled={exporting}
              onClick={() => runExport(true)}
            >
              <FileText /> {exporting ? "Gerando arquivo…" : "Exportar PDF"}
            </Button>
          </div>
          <Button
            variant="destructive"
            onClick={() => {
              setManage(false);
              setConfirmDelete(true);
            }}
          >
            <Trash2 /> Excluir turma
          </Button>
        </DialogContent>
      </Dialog>
      <GradeHistoryDialog cls={cls} open={history} onOpenChange={setHistory} />
      <PhotoImporter
        classId={classId}
        open={importer === "photo"}
        onOpenChange={(open) => !open && setImporter(null)}
      />
      <ProvaPaulistaImporter
        classId={classId}
        open={importer === "pp"}
        onOpenChange={(open) => !open && setImporter(null)}
      />
      <FrequenciaTutorImporter
        classId={classId}
        open={importer === "frequency"}
        onOpenChange={(open) => !open && setImporter(null)}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Excluir turma "${cls.name}"?`}
        description="Todos os alunos, notas, fotos, anotações e bimestres salvos serão removidos permanentemente."
        confirmLabel="Excluir turma"
        onConfirm={async () => {
          await deleteClass(classId);
          toast.success("Turma excluída.");
          router.push("/");
        }}
      />
    </div>
  );
}
