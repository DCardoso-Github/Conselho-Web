"use client";

import * as React from "react";
import NumberFlow from "@number-flow/react";
import { AlertTriangle, Users, CheckCircle2, BookX } from "lucide-react";
import type { StudentRecord } from "@/lib/db";
import { isLowGrade } from "@/lib/actions";
import { formatSubject } from "@/lib/mapao/subjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface DashboardProps {
    students: StudentRecord[];
    subjects: string[];
}

export function ClassDashboard({ students, subjects }: DashboardProps) {
    const stats = React.useMemo(() => {
        const total = students.length;
        const withLow = students.filter((s) =>
            Object.values(s.grades).some((g) => isLowGrade(g))
        ).length;
        const approval = total === 0 ? 0 : Math.round(((total - withLow) / total) * 100);

        const perSubject = subjects
            .map((subj) => {
                const lowCount = students.filter((s) => isLowGrade(s.grades[subj])).length;
                const pct = total === 0 ? 0 : (lowCount / total) * 100;
                return { subject: subj, lowCount, pct };
            })
            .sort((a, b) => b.pct - a.pct);

        const critical = perSubject.filter((p) => p.pct >= 30).length;

        return { total, withLow, approval, perSubject, critical };
    }, [students, subjects]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
            <div className="grid grid-cols-2 gap-3">
                <Kpi
                    label="Alunos"
                    value={stats.total}
                    icon={<Users className="size-4" />}
                    tone="primary"
                />
                <Kpi
                    label="Com vermelha"
                    value={stats.withLow}
                    hint={`${stats.total === 0 ? 0 : Math.round((stats.withLow / stats.total) * 100)}% da turma`}
                    icon={<AlertTriangle className="size-4" />}
                    tone="danger"
                />
                <Kpi
                    label="Aprovação"
                    value={stats.approval}
                    suffix="%"
                    icon={<CheckCircle2 className="size-4" />}
                    tone="success"
                />
                <Kpi
                    label="Disc. críticas"
                    value={stats.critical}
                    hint="≥ 30% com vermelha"
                    icon={<BookX className="size-4" />}
                    tone="warn"
                />
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Disciplinas — % de alunos com nota vermelha
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {stats.perSubject.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sem disciplinas.</p>
                    ) : (
                        <ul className="space-y-1.5">
                            {stats.perSubject.map((p) => (
                                <li
                                    key={p.subject}
                                    className="flex items-center gap-3 text-sm"
                                >
                                    <span
                                        className="w-32 sm:w-44 truncate font-medium"
                                        title={formatSubject(p.subject)}
                                    >
                                        {formatSubject(p.subject)}
                                    </span>
                                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700 ease-out"
                                            style={{
                                                width: `${Math.max(p.pct, p.lowCount > 0 ? 4 : 0)}%`,
                                                background: heatColor(p.pct),
                                            }}
                                        />
                                    </div>
                                    <span className="w-20 text-right tabular-nums text-muted-foreground text-xs">
                                        {p.lowCount} ({Math.round(p.pct)}%)
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function heatColor(pct: number): string {
    if (pct >= 50) return "var(--danger)";
    if (pct >= 30) return "var(--warning)";
    if (pct >= 15) return "var(--accent)";
    if (pct > 0) return "var(--success)";
    return "var(--muted)";
}

function Kpi({
    label,
    value,
    suffix,
    hint,
    icon,
    tone,
}: {
    label: string;
    value: number;
    suffix?: string;
    hint?: string;
    icon?: React.ReactNode;
    tone?: "primary" | "danger" | "success" | "warn";
}) {
    const toneVar: Record<string, string> = {
        primary: "var(--primary)",
        danger: "var(--danger)",
        success: "var(--success)",
        warn: "var(--warning)",
    };
    const c = tone ? toneVar[tone] : "var(--primary)";
    return (
        <Card className="relative overflow-hidden">
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {label}
                        </div>
                        <div className="text-3xl font-bold tabular-nums leading-tight">
                            <NumberFlow value={value} />
                            {suffix}
                        </div>
                        {hint && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                {hint}
                            </div>
                        )}
                    </div>
                    {icon && (
                        <div
                            className="shrink-0 grid size-9 place-items-center rounded-xl"
                            style={{
                                background: `color-mix(in srgb, ${c} 14%, transparent)`,
                                color: c,
                            }}
                        >
                            {icon}
                        </div>
                    )}
                </div>
                <div
                    className="absolute inset-x-0 bottom-0 h-0.5 opacity-70"
                    style={{ background: c }}
                />
            </CardContent>
        </Card>
    );
}
