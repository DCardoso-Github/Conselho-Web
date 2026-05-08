"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "next-themes";
import {
    GraduationCap,
    Home,
    Upload,
    Sun,
    Moon,
    Monitor,
    PanelLeftClose,
    PanelLeftOpen,
    Search,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useClasses } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";

const SIDEBAR_KEY = "conselho-sidebar";

function useSidebar() {
    const [collapsed, setCollapsed] = React.useState(false);
    React.useEffect(() => {
        const v = localStorage.getItem(SIDEBAR_KEY);
        if (v === "1") setCollapsed(true);
    }, []);
    const toggle = React.useCallback(() => {
        setCollapsed((c) => {
            const next = !c;
            localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
            return next;
        });
    }, []);
    return { collapsed, toggle };
}

function ThemeMenu() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);
    const Icon =
        !mounted ? Monitor : theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Tema">
                    <Icon className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Tema</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun /> Claro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon /> Escuro
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Monitor /> Sistema
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

interface ClassListItemProps {
    id: string;
    name: string;
    href: string;
    active: boolean;
    collapsed: boolean;
}

const ClassListItem = React.memo(function ClassListItem({
    id, name, href, active, collapsed,
}: ClassListItemProps) {
    const link = (
        <Link
            href={href}
            className={cn(
                "group relative flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
        >
            {active && (
                <motion.span
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
            )}
            <span
                className={cn(
                    "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold",
                    active
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary"
                )}
            >
                {id.slice(0, 2)}
            </span>
            {!collapsed && <span className="truncate">{name}</span>}
        </Link>
    );
    if (collapsed) {
        return (
            <Tooltip key={id}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{name}</TooltipContent>
            </Tooltip>
        );
    }
    return link;
});

function ClassList({ collapsed }: { collapsed: boolean }) {
    const classes = useClasses();
    const pathname = usePathname();
    if (!classes.length) {
        return collapsed ? null : (
            <div className="px-3 py-2 text-xs text-muted-foreground">
                Nenhuma turma ainda. Importe um mapão.
            </div>
        );
    }
    return (
        <div className="flex flex-col gap-0.5 px-2">
            {!collapsed && (
                <div className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Turmas
                </div>
            )}
            {classes.map((c) => {
                const href = `/turmas/${encodeURIComponent(c.id)}`;
                const active = !!pathname?.startsWith(href);
                return (
                    <ClassListItem
                        key={c.id}
                        id={c.id}
                        name={c.name}
                        href={href}
                        active={active}
                        collapsed={collapsed}
                    />
                );
            })}
        </div>
    );
}

export function AppShell({ children }: { children: React.ReactNode }) {
    const { collapsed, toggle } = useSidebar();
    const cmd = useCommandPalette();
    const pathname = usePathname();
    const isPresenting = pathname?.includes("/apresentar");
    const isStudent = /\/turmas\/[^/]+\/alunos\/[^/]+/.test(pathname ?? "");
    const [mobileOpen, setMobileOpen] = React.useState(false);
    React.useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    if (isPresenting || isStudent) {
        // Apresentar e detalhe do aluno: fullscreen, sem shell
        return <>{children}</>;
    }

    return (
        <div className="flex h-dvh w-full overflow-hidden bg-background">
            {/* Sidebar */}
            <aside
                className={cn(
                    "no-print hidden md:flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-out",
                    collapsed ? "w-16" : "w-64"
                )}
            >
                <div
                    className={cn(
                        "flex items-center gap-2 h-14 border-b border-sidebar-border",
                        collapsed ? "justify-center px-2" : "px-3"
                    )}
                >
                    <Link
                        href="/"
                        className="flex items-center gap-2 font-semibold tracking-tight overflow-hidden"
                        title="Conselho"
                    >
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                            <GraduationCap className="size-5" />
                        </span>
                        {!collapsed && (
                            <span className="truncate">Conselho</span>
                        )}
                    </Link>
                </div>

                <div className="flex flex-col gap-0.5 p-2">
                    <NavLink href="/" icon={<Home />} label="Início" collapsed={collapsed} />
                    <NavLink href="/importar" icon={<Upload />} label="Importar" collapsed={collapsed} />
                    <Button
                        variant="ghost"
                        onClick={() => cmd.setOpen(true)}
                        className={cn(
                            "justify-start font-medium text-muted-foreground hover:text-foreground",
                            collapsed && "justify-center"
                        )}
                    >
                        <Search className="size-4" />
                        {!collapsed && (
                            <>
                                <span>Buscar</span>
                                <span className="ml-auto inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                                    ⌘K
                                </span>
                            </>
                        )}
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                    <ClassList collapsed={collapsed} />
                </div>

                <div className="border-t border-sidebar-border p-2 flex items-center gap-1">
                    <ThemeMenu />
                    {!collapsed && (
                        <span className="text-xs text-muted-foreground ml-1 flex-1 truncate">v3 · local</span>
                    )}
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        className={cn(collapsed ? "mx-auto" : "ml-auto")}
                        onClick={toggle}
                        aria-label={collapsed ? "Expandir" : "Colapsar"}
                    >
                        {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
                    </Button>
                </div>
            </aside>

            {/* Main column — sem topbar */}
            <div className="flex flex-col flex-1 min-w-0 relative">
                <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
                            className="min-h-full"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            {/* Mobile bottom nav */}
            <nav
                className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]"
                aria-label="Navegação principal"
            >
                <BottomTab href="/" icon={<Home className="size-5" />} label="Início" />
                <BottomTab
                    onClick={() => cmd.setOpen(true)}
                    icon={<Search className="size-5" />}
                    label="Buscar"
                />
                <BottomTab
                    onClick={() => setMobileOpen(true)}
                    icon={<GraduationCap className="size-5" />}
                    label="Turmas"
                />
                <BottomTab href="/importar" icon={<Upload className="size-5" />} label="Importar" />
            </nav>

            <CommandPalette open={cmd.open} setOpen={cmd.setOpen} />

            {/* Mobile sidebar overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: -300 }}
                            animate={{ x: 0 }}
                            exit={{ x: -300 }}
                            transition={{ type: "spring", stiffness: 380, damping: 36 }}
                            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border md:hidden"
                        >
                            <div className="flex items-center gap-2 px-3 h-14 border-b border-sidebar-border">
                                <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
                                    <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                        <GraduationCap className="size-5" />
                                    </span>
                                    <span>Conselho</span>
                                </Link>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="ml-auto"
                                    onClick={() => setMobileOpen(false)}
                                    aria-label="Fechar menu"
                                >
                                    <X className="size-4" />
                                </Button>
                            </div>
                            <div className="flex flex-col gap-0.5 p-2">
                                <NavLink href="/" icon={<Home />} label="Início" collapsed={false} />
                                <NavLink href="/importar" icon={<Upload />} label="Importar" collapsed={false} />
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setMobileOpen(false);
                                        cmd.setOpen(true);
                                    }}
                                    className="justify-start font-medium text-muted-foreground hover:text-foreground"
                                >
                                    <Search className="size-4" />
                                    <span>Buscar</span>
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto py-2">
                                <ClassList collapsed={false} />
                            </div>
                            <div className="border-t border-sidebar-border p-2 flex items-center gap-1">
                                <ThemeMenu />
                                <span className="text-xs text-muted-foreground ml-1">v3 · local</span>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

function NavLink({
    href,
    icon,
    label,
    collapsed,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    collapsed: boolean;
}) {
    const pathname = usePathname();
    const active = pathname === href;
    const node = (
        <Link
            href={href}
            className={cn(
                "relative flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors [&_svg]:size-4",
                active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                collapsed && "justify-center"
            )}
        >
            {icon}
            {!collapsed && <span>{label}</span>}
        </Link>
    );
    if (collapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>{node}</TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
        );
    }
    return node;
}

function BottomTab({
    href,
    onClick,
    icon,
    label,
}: {
    href?: string;
    onClick?: () => void;
    icon: React.ReactNode;
    label: string;
}) {
    const pathname = usePathname();
    const active = href ? pathname === href : false;
    const cls = cn(
        "flex-1 flex flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition-colors",
        active
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground active:bg-secondary/60"
    );
    if (href) {
        return (
            <Link href={href} className={cls} aria-current={active ? "page" : undefined}>
                {icon}
                <span>{label}</span>
            </Link>
        );
    }
    return (
        <button type="button" onClick={onClick} className={cls}>
            {icon}
            <span>{label}</span>
        </button>
    );
}
