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
    Sparkles,
    GraduationCap,
} from "lucide-react";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { db } from "@/lib/db";
import { useClasses } from "@/lib/hooks";

export function useCommandPalette() {
    const [open, setOpen] = React.useState(false);
    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
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
    setOpen: (v: boolean) => void;
}) {
    const router = useRouter();
    const { setTheme } = useTheme();
    const classes = useClasses();
    const students = useLiveQuery(() => db.students.toArray(), [], []);

    const go = React.useCallback(
        (href: string) => {
            router.push(href);
            setOpen(false);
        },
        [router, setOpen]
    );

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Buscar turmas, alunos ou ações…" />
            <CommandList>
                <CommandEmpty>Nada encontrado.</CommandEmpty>

                <CommandGroup heading="Navegar">
                    <CommandItem onSelect={() => go("/")}>
                        <Home /> Início
                    </CommandItem>
                    <CommandItem onSelect={() => go("/importar")}>
                        <Upload /> Importar mapão
                    </CommandItem>
                </CommandGroup>

                {classes.length > 0 && (
                    <>
                        <CommandSeparator />
                        <CommandGroup heading={`Turmas (${classes.length})`}>
                            {classes.map((c) => (
                                <CommandItem
                                    key={c.id}
                                    value={`turma ${c.name}`}
                                    onSelect={() => go(`/turmas/${encodeURIComponent(c.id)}`)}
                                >
                                    <GraduationCap /> {c.name}
                                    <span className="ml-auto text-xs text-muted-foreground">
                                        {c.subjects.length} disc.
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </>
                )}

                {students && students.length > 0 && (
                    <>
                        <CommandSeparator />
                        <CommandGroup heading={`Alunos (${students.length})`}>
                            {students.slice(0, 200).map((s) => (
                                <CommandItem
                                    key={s.id}
                                    value={`aluno ${s.name} ${s.classId}`}
                                    onSelect={() =>
                                        go(
                                            `/turmas/${encodeURIComponent(s.classId)}/alunos/${s.id}`
                                        )
                                    }
                                >
                                    <Users />
                                    <span className="truncate">{s.name}</span>
                                    <span className="ml-auto text-xs text-muted-foreground">
                                        {s.classId}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </>
                )}

                <CommandSeparator />
                <CommandGroup heading="Tema">
                    <CommandItem
                        onSelect={() => {
                            setTheme("light");
                            setOpen(false);
                        }}
                    >
                        <Sun /> Claro
                    </CommandItem>
                    <CommandItem
                        onSelect={() => {
                            setTheme("dark");
                            setOpen(false);
                        }}
                    >
                        <Moon /> Escuro
                    </CommandItem>
                    <CommandItem
                        onSelect={() => {
                            setTheme("system");
                            setOpen(false);
                        }}
                    >
                        <Monitor /> Sistema
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
