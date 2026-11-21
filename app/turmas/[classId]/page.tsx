"use client";
import { use, useState, useDeferredValue, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import {
  Activity,
  CalendarCheck,
  Layers,
  Play,
  ChartColumn,
  Settings2,
  Search,
  SlidersHorizontal,
  FileText,
  Download,
  Trash2,
  Users,
  Star,
  TrendingUp,
} from "lucide-react";
import { db } from "@/lib/db";
import { gradeBands, readBand } from "@/lib/analysis-navigation";
import { deleteClass, isLowGrade } from "@/lib/actions";
import { hasLowGrades, hasValue } from "@/lib/presentation";
import { formatSubject } from "@/lib/mapao/subjects";
import { exportClassToXlsx } from "@/lib/mapao/exporter";
import { StudentGrid, type StudentSort } from "@/components/student-card";
import { importOptions, type ImportKind } from "@/components/import-options";
import { ClassImportDialog } from "@/components/class-import-dialogs";
import { GradeHistoryDialog } from "@/components/grade-history-dialog";
import { StudentEvolution } from "@/components/student-evolution";
import { periodLabel } from "@/lib/evolution";
import { StudentHighlights } from "@/components/student-highlights";
import { StudentActionsProvider } from "@/components/student-actions";
import { ClassEvolutionSection } from "@/components/class-evolution-dashboard";
import { ClassDashboard } from "@/components/class-dashboard";
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
const sections = [
  { value: "students", label: "Alunos", icon: Users },
  { value: "highlights", label: "Alunos destaque", icon: Star },
  { value: "evolution", label: "Alunos evolução", icon: TrendingUp },
  { value: "overview", label: "Visão geral", icon: ChartColumn },
  { value: "class-evolution", label: "Evolução da turma", icon: Activity },
] as const;

export default function TurmaPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = use(params);
  const query = useSearchParams();
  const filterKey = JSON.stringify([classId, query.get("subject"), query.get("band")]);
  return <TurmaContent key={filterKey} classId={decodeURIComponent(classId)} />;
}

function TurmaContent({ classId }: { classId: string }) {
  const router = useRouter();
  const query = useSearchParams();
  const data = useLiveQuery(async () => {
    const [cls, students] = await Promise.all([
      db.classes.get(classId),
      db.students.where("classId").equals(classId).sortBy("order"),
    ]);
    return { cls, students };
  }, [classId]);
  const [search, setSearch] = useState("");
  const [band, setBand] = useState(readBand(query.get("band")));
  const requested = query.get("view") ?? "";
  const view = requested === "analyses" ? "overview" : sections.find(item => item.value === requested)?.value ?? "students";
  const classPath = `/turmas/${encodeURIComponent(classId)}`;
  const [selectionRequest, setSelectionRequest] = useState<{ id: number; serial: number } | null>(null);
  const deferredSearch = useDeferredValue(search);
  const [onlyLow, setOnlyLow] = useState(false);
  const [redSubject, setRedSubject] = useState<string | null>(query.get("subject"));
  const [sort, setSort] = useState<StudentSort>("order");
  const [filters, setFilters] = useState(false);
  const [manage, setManage] = useState(false);
  const [history, setHistory] = useState(false);
  const [returnToManagement, setReturnToManagement] = useState<ImportKind | null>(null);
  const manageButton = useRef<HTMLButtonElement>(null);
  const importButtonToFocus = useRef<ImportKind | null>(null);
  const [start, setStart] = useState(false);
  const [scope, setScope] = useState<"all" | "low">("all");
  const [importer, setImporter] = useState<"photo" | "pp" | "frequency" | null>(
    null,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exporting, setExporting] = useState(false);
  const clear = () => {
    setSelectionRequest(null);
    setSearch("");
    setBand(undefined);
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
  const activeSubject = cls.subjects.includes(redSubject ?? "") ? redSubject : null;
  const low = students.filter(hasLowGrades).length;
  const filterCount =
    Number(onlyLow || !!redSubject || !!band) + Number(sort !== "order");
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
  const openImporter = (kind: ImportKind) => {
    setReturnToManagement(kind);
    setManage(false);
    if (kind === "map") setHistory(true);
    else setImporter(kind);
  };
  const closeImporter = () => {
    setHistory(false);
    setImporter(null);
    if (returnToManagement) {
      importButtonToFocus.current = returnToManagement;
      setManage(true);
    }
    setReturnToManagement(null);
  };
  return (
    <div className="console-container class-screen">
      <header className="class-banner">
        <div className="class-banner-identity">
          <span className="class-insignia" aria-hidden="true"><Layers /></span>
          <div><p className="focus-label">Turma</p><h1>{cls.name}</h1></div>
        </div>
        <div className="class-facts">
          {cls.currentPeriod && <span><CalendarCheck />{periodLabel(cls.currentPeriod)}</span>}
          <span><Users />{students.length} alunos</span>
        </div>
        <div className="class-primary-actions">
          <Button size="xl" disabled={!students.length} onClick={() => { setScope("all"); setStart(true); }}>
            <Play fill="currentColor" />Iniciar conselho
          </Button>
          <Button size="xl" variant="outline" ref={manageButton} className="manage-class" onClick={() => setManage(true)}>
            <Settings2 />Gerenciar turma
          </Button>
        </div>
      </header>
      <nav className="class-sections" aria-label="Áreas da turma">
        {sections.map(({value,label,icon:Icon}) => <Link key={value}
          href={`${classPath}?view=${value}`} scroll={false} aria-current={view === value ? "page" : undefined}>
          <Icon aria-hidden="true" /><span>{label}</span>
        </Link>)}
      </nav>
      <StudentActionsProvider subjects={cls.subjects} onSelect={student => {
        if (student.id === undefined) return;
        clear();
        setSelectionRequest({ id: student.id, serial: Date.now() });
        if (view !== "students") router.push(`${classPath}?view=students`, { scroll: false });
        requestAnimationFrame(() => {
          document.querySelector<HTMLInputElement>(`[data-student-id="${student.id}"] input[type="checkbox"]`)?.focus();
        });
      }}>
      {view === "students" && <section className="roster" aria-label="Lista de alunos">
          <header className="roster-heading"><h2>Alunos</h2>
          <div className="search-toolbar">
            <div className="search-field">
              <Search />
              <Input
                aria-label="Buscar aluno"
                placeholder="Buscar aluno pelo nome…"
                value={search}
                onChange={(event) => { setSelectionRequest(null); setSearch(event.target.value); }}
              />
            </div>
            <Button variant="outline" onClick={() => setFilters(true)}>
              <SlidersHorizontal /> Filtros
              {filterCount ? ` (${filterCount})` : ""}
            </Button>
          </div>
          </header>
          {(onlyLow || redSubject || band || sort !== "order") && (
            <div className="active-filters" role="status">
              <span>
                {activeSubject
                  ? `${band ? gradeBands[band] : "Notas vermelhas"} em ${formatSubject(activeSubject)}`
                  : band ? gradeBands[band]
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
            band={band}
            selectionRequest={selectionRequest}
            onClearSelection={() => setSelectionRequest(null)}
            classId={classId}
            search={deferredSearch}
            onlyLow={onlyLow}
            redSubject={activeSubject}
            sort={sort}
            onClearFilters={clear}
          />
        </section>}
      {view === "highlights" && <section>
          <StudentHighlights
            students={students}
            subjects={cls.subjects}
            classId={classId}
          />
        </section>}
      {view === "evolution" && <section>
          <StudentEvolution
            cls={cls}
            students={students}
            onImport={() => setHistory(true)}
          />
        </section>}
      {view === "overview" && <section>
          <ClassDashboard students={students} subjects={cls.subjects} classId={classId} />
        </section>}
      {view === "class-evolution" && <ClassEvolutionSection classId={classId} students={students} onImport={() => setHistory(true)} />}
      </StudentActionsProvider>
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
                setSelectionRequest(null);
                setOnlyLow(event.target.checked);
                setBand(undefined);
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
                setSelectionRequest(null);
                setRedSubject(event.target.value || null);
                setBand(undefined);
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
              onChange={(event) => { setSelectionRequest(null); setSort(event.target.value as StudentSort); }}
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
        <DialogContent className="management-dialog"
          onOpenAutoFocus={event => {
            const kind = importButtonToFocus.current;
            importButtonToFocus.current = null;
            const button = kind && document.querySelector<HTMLButtonElement>(`[data-import-option="${kind}"]`);
            if (button) { event.preventDefault(); button.focus(); }
          }}
          onCloseAutoFocus={event => { event.preventDefault(); if (!document.querySelector('[role="dialog"][data-state="open"]')) manageButton.current?.focus(); }}
        >
          <DialogHeader>
            <DialogTitle>Gerenciar turma {cls.name}</DialogTitle>
            <DialogDescription>Importada em {new Date(cls.importedAt).toLocaleDateString("pt-BR")}.</DialogDescription>
          </DialogHeader>
          <div className="management-body">
            <section aria-label="Importações"><h3>Importar dados</h3>
              <div className="import-choices">
                {importOptions.map(({value, label, detail, icon: Icon}) => <button key={value} data-import-option={value} onClick={() => openImporter(value)} aria-label={label}>
                  <span className="choice-symbol"><Icon /></span><span><strong>{label}</strong><small>{detail}</small></span>
                </button>)}
              </div>
            </section>
            <section className="management-exports"><h3>Exportar turma</h3>
              <div><Button variant="outline" disabled={exporting} onClick={() => runExport(false)}><Download />Exportar planilha</Button>
              <Button variant="outline" disabled={exporting} onClick={() => runExport(true)}><FileText />Exportar PDF</Button></div>
            </section>
          </div>
          <footer className="management-footer"><Button variant="ghost" className="text-destructive" onClick={() => { setManage(false); setConfirmDelete(true); }}><Trash2 />Excluir turma</Button></footer>
        </DialogContent>
      </Dialog>
      <GradeHistoryDialog cls={cls} open={history} onOpenChange={open => { if (!open) closeImporter(); }} />
      {importer && <ClassImportDialog kind={importer} classId={classId} onClose={closeImporter} />}
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
