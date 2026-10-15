"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Home,
  Upload,
  Users,
  Sun,
  Moon,
  Monitor,
  GraduationCap,
  Search,
  X,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { db } from "@/lib/db";
import { useClasses } from "@/lib/hooks";
import { matchesSearch } from "@/lib/class-analytics";
import { shortcutBlocked } from "@/lib/presentation";
import { Button } from "./ui/button";

export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "k" &&
        !shortcutBlocked(e.target)
      ) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}

export function CommandPalette({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
}) {
  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      shouldFilter={false}
      className="search-dialog"
    >
      {open && <SearchContent close={() => setOpen(false)} />}
    </CommandDialog>
  );
}

function SearchContent({ close }: { close: () => void }) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const classes = useClasses();
  const students = useLiveQuery(() => db.students.toArray(), [], []);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [limit, setLimit] = React.useState(12);
  const go = (href: string) => {
    router.push(href);
    close();
  };
  const actions = [
    {
      id: "home",
      title: "Início",
      detail: "Escolher uma turma",
      icon: Home,
      run: () => go("/"),
    },
    {
      id: "import",
      title: "Importar mapão",
      detail: "Adicionar turmas e notas",
      icon: Upload,
      run: () => go("/importar"),
    },
    ...classes.map((cls) => ({
      id: `evolution-${cls.id}`,
      title: `Evolução da turma ${cls.name}`,
      detail: "Comparar bimestres",
      icon: TrendingUp,
      run: () => go(`/turmas/${encodeURIComponent(cls.id)}/evolucao`),
    })),
    ...[
      { id: "light", title: "Tema claro", icon: Sun },
      { id: "dark", title: "Tema escuro", icon: Moon },
      { id: "system", title: "Tema do sistema", icon: Monitor },
    ].map((item) => ({
      ...item,
      detail: "Aparência",
      run: () => {
        setTheme(item.id);
        close();
      },
    })),
  ];
  const matchedStudents = students.filter((student) =>
    matchesSearch(`aluno ${student.name} ${student.classId}`, query),
  );
  const matchedClasses = classes.filter((cls) =>
    matchesSearch(`turma ${cls.name}`, query),
  );
  const matchedActions = actions.filter((action) =>
    matchesSearch(`${action.title} ${action.detail}`, query),
  );
  const groups = [
    {
      id: "all",
      label: "Tudo",
      count:
        matchedStudents.length + matchedClasses.length + matchedActions.length,
    },
    { id: "students", label: "Alunos", count: matchedStudents.length },
    { id: "classes", label: "Turmas", count: matchedClasses.length },
    { id: "actions", label: "Ações", count: matchedActions.length },
  ];
  const total = groups.find((group) => group.id === category)!.count;
  const showClasses = category === "all" || category === "classes";
  const showStudents = category === "all" || category === "students";
  const showActions = category === "all" || category === "actions";
  const hidden =
    (showClasses ? Math.max(0, matchedClasses.length - limit) : 0) +
    (showStudents ? Math.max(0, matchedStudents.length - limit) : 0) +
    (showActions ? Math.max(0, matchedActions.length - limit) : 0);
  return (
    <>
      <header className="search-dialog-header">
        <div>
          <span className="analytics-icon">
            <Search aria-hidden="true" />
          </span>
          <div>
            <strong>Encontre o que precisa</strong>
            <p>Alunos, turmas e ações do Conselho</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={close}
          aria-label="Fechar busca"
        >
          <X />
        </Button>
      </header>
      <CommandInput
        aria-label="Buscar turmas, alunos ou ações"
        placeholder="Digite um nome, turma ou ação…"
        value={query}
        onValueChange={(value) => {
          setQuery(value);
          setLimit(12);
        }}
      />
      <div
        className="search-categories"
        role="group"
        aria-label="Filtrar resultados da busca"
      >
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            aria-pressed={category === group.id}
            onClick={() => {
              setCategory(group.id);
              setLimit(12);
            }}
          >
            {group.label}
            <span>{group.count}</span>
          </button>
        ))}
      </div>
      <p className="search-result-count" role="status">
        {total} {total === 1 ? "resultado" : "resultados"}{query ? ` para “${query}”` : total === 1 ? " disponível" : " disponíveis"}
      </p>
      <CommandList>
        {!total && (
          <div className="search-empty">
            <Search aria-hidden="true" />
            <strong>Nenhum resultado encontrado</strong>
            <p>Tente parte do nome, outra turma ou remova o filtro.</p>
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
            >
              Limpar busca
            </Button>
          </div>
        )}
        {showClasses && matchedClasses.length > 0 && (
          <CommandGroup heading={`Turmas · ${matchedClasses.length}`}>
            {matchedClasses.slice(0, limit).map((cls) => (
              <CommandItem
                key={cls.id}
                value={`class-${cls.id}`}
                onSelect={() => go(`/turmas/${encodeURIComponent(cls.id)}`)}
              >
                <span className="search-item-icon">
                  <GraduationCap />
                </span>
                <span className="search-item-text">
                  <strong>Turma {cls.name}</strong>
                  <small>{cls.subjects.length} disciplinas · abrir turma</small>
                </span>
                <ArrowUpRight className="search-item-arrow" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {showStudents && matchedStudents.length > 0 && (
          <CommandGroup heading={`Alunos · ${matchedStudents.length}`}>
            {matchedStudents.slice(0, limit).map((student) => (
              <CommandItem
                key={student.id}
                value={`student-${student.id}`}
                onSelect={() =>
                  go(
                    `/turmas/${encodeURIComponent(student.classId)}/alunos/${student.id}`,
                  )
                }
              >
                <span className="search-item-icon">
                  <Users />
                </span>
                <span className="search-item-text">
                  <strong>{student.name}</strong>
                  <small>Turma {student.classId} · abrir ficha do aluno</small>
                </span>
                <ArrowUpRight className="search-item-arrow" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {showActions && matchedActions.length > 0 && (
          <CommandGroup heading={`Ações · ${matchedActions.length}`}>
            {matchedActions.slice(0, limit).map((action) => (
              <CommandItem
                key={action.id}
                value={action.id}
                onSelect={action.run}
              >
                <span className="search-item-icon">
                  <action.icon />
                </span>
                <span className="search-item-text">
                  <strong>{action.title}</strong>
                  <small>{action.detail}</small>
                </span>
                <ArrowUpRight className="search-item-arrow" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
      {hidden > 0 && (
        <Button
          className="search-load-more"
          variant="outline"
          onClick={() => {
            setLimit(limit + 24);
          }}
        >
          Ver mais resultados
        </Button>
      )}
      <footer className="search-dialog-footer">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> navegar
        </span>
        <span>
          <kbd>Enter</kbd> abrir
        </span>
        <span>
          <kbd>Esc</kbd> fechar
        </span>
      </footer>
    </>
  );
}
