/**
 * Documento PDF de notas da turma — um aluno por página.
 * Renderizado com @react-pdf/renderer.
 */
import React from "react";
import {
    Document,
    Page,
    View,
    Text,
    Image,
    StyleSheet,
    Font,
} from "@react-pdf/renderer";
import { type StudentRecord } from "./db";
import { formatSubject } from "./mapao/subjects";

// ─── helpers ────────────────────────────────────────────────────────────────

function isLow(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    const n = Number(String(value).trim().replace(",", "."));
    if (Number.isNaN(n)) return false;
    return n <= 4;
}

function fmtGrade(v: unknown): string {
    if (v === null || v === undefined || String(v).trim() === "") return "S/N";
    return String(v).trim();
}

function fmtAbs(v: unknown): string {
    if (v === null || v === undefined || String(v).trim() === "" || String(v).trim() === "-") return "";
    return `${String(v).trim()}F`;
}

function fmtNum(v: unknown): string {
    if (v === null || v === undefined || String(v).trim() === "") return "—";
    const n = Number(String(v).replace(",", "."));
    if (Number.isNaN(n)) return String(v);
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

function fmtPct(v: unknown): string {
    if (v === null || v === undefined || String(v).trim() === "") return "—";
    const n = Number(String(v).replace(",", "."));
    if (Number.isNaN(n)) return String(v);
    return `${n.toFixed(1).replace(".", ",")}%`;
}

// ─── palette ────────────────────────────────────────────────────────────────

const PRIMARY = "#1d4ed8";
const PRIMARY_DARK = "#1e3a8a";
const PRIMARY_SOFT = "#eff6ff";
const RED = "#dc2626";
const RED_BG = "#fff1f2";
const RED_BORDER = "#fecdd3";
const SUCCESS = "#15803d";
const SUCCESS_BG = "#f0fdf4";
const WARN = "#b45309";
const WARN_BG = "#fffbeb";
const MUTED = "#6b7280";
const MUTED_LIGHT = "#9ca3af";
const CARD_BG = "#f8fafc";
const BORDER = "#e2e8f0";
const BORDER_LIGHT = "#f1f5f9";
const TEXT = "#0f172a";
const TEXT_SOFT = "#334155";
const WHITE = "#ffffff";

// ─── styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    page: {
        fontFamily: "Helvetica",
        backgroundColor: WHITE,
        padding: 0,
        flexDirection: "column",
    },

    // ── header ──
    header: {
        backgroundColor: PRIMARY_DARK,
        paddingHorizontal: 32,
        paddingTop: 14,
        paddingBottom: 0,
        flexDirection: "column",
    },
    headerTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 12,
    },
    headerBrand: {
        color: "#93c5fd",
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
        textTransform: "uppercase",
        letterSpacing: 1.2,
    },
    headerClassName: {
        color: WHITE,
        fontSize: 15,
        fontFamily: "Helvetica-Bold",
    },
    headerIndex: {
        color: "#93c5fd",
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
    },
    headerAccent: {
        height: 4,
        backgroundColor: "#3b82f6",
    },

    // ── body ──
    body: {
        paddingHorizontal: 32,
        paddingTop: 20,
        paddingBottom: 16,
        flexDirection: "row",
        gap: 28,
        flex: 1,
    },

    // ── left column ──
    leftCol: {
        width: 290,
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
    },
    photoWrapper: {
        borderRadius: 16,
        overflow: "hidden",
        width: 270,
        height: 270,
    },
    photo: {
        width: 270,
        height: 270,
        objectFit: "cover",
    },
    avatarBox: {
        width: 270,
        height: 270,
        backgroundColor: PRIMARY_SOFT,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarInitial: {
        fontSize: 96,
        color: PRIMARY,
        fontFamily: "Helvetica-Bold",
    },
    studentName: {
        fontSize: 14,
        fontFamily: "Helvetica-Bold",
        color: TEXT,
        textAlign: "center",
        lineHeight: 1.4,
        marginTop: 10,
        paddingHorizontal: 4,
    },
    dividerLine: {
        height: 1,
        backgroundColor: BORDER_LIGHT,
        width: "100%",
        marginTop: 8,
        marginBottom: 8,
    },
    badgeRow: {
        flexDirection: "row",
        gap: 4,
        flexWrap: "wrap",
        justifyContent: "center",
        marginTop: 4,
    },
    badgeLow: {
        backgroundColor: RED_BG,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: RED_BORDER,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    badgeLowText: {
        color: RED,
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
    },
    badgeOk: {
        backgroundColor: SUCCESS_BG,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: "#86efac",
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    badgeOkText: {
        color: SUCCESS,
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
    },

    // ── right column ──
    rightCol: {
        flex: 1,
        flexDirection: "column",
        gap: 14,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
    },
    sectionAccentBar: {
        width: 3,
        height: 12,
        backgroundColor: PRIMARY,
        borderRadius: 2,
    },
    sectionLabel: {
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        color: TEXT_SOFT,
        textTransform: "uppercase",
        letterSpacing: 0.9,
    },

    // ── subjects grid ──
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    subjectCard: {
        width: "47%",
        backgroundColor: CARD_BG,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: BORDER,
        paddingHorizontal: 10,
        paddingTop: 9,
        paddingBottom: 10,
    },
    subjectCardLow: {
        backgroundColor: RED_BG,
        borderColor: RED_BORDER,
        borderLeftWidth: 4,
        borderLeftColor: RED,
    },
    subjectName: {
        fontSize: 11,
        color: MUTED_LIGHT,
        lineHeight: 1.3,
        marginBottom: 5,
    },
    subjectNameLow: {
        color: "#f87171",
    },
    gradeRow: {
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
    },
    gradeValue: {
        fontSize: 16,
        fontFamily: "Helvetica-Bold",
        color: TEXT,
        lineHeight: 1,
    },
    gradeValueLow: {
        color: RED,
    },
    absValue: {
        fontSize: 11,
        color: MUTED_LIGHT,
        fontFamily: "Helvetica-Oblique",
    },

    // ── notes ──
    notesBox: {
        borderRadius: 7,
        borderWidth: 1,
        borderColor: "#e9d5ff",
        borderLeftWidth: 3,
        borderLeftColor: "#7c3aed",
        backgroundColor: "#faf5ff",
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    notesLabel: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: "#7c3aed",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    notesText: {
        fontSize: 9,
        color: TEXT_SOFT,
        lineHeight: 1.55,
    },

    // ── footer ──
    footer: {
        borderTopWidth: 1,
        borderTopColor: BORDER,
        backgroundColor: CARD_BG,
        paddingHorizontal: 32,
        paddingVertical: 12,
        flexDirection: "row",
        gap: 8,
    },
    statBox: {
        flex: 1,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: WHITE,
        paddingHorizontal: 10,
        paddingVertical: 8,
        alignItems: "center",
        gap: 3,
    },
    statLabel: {
        fontSize: 6.5,
        color: MUTED_LIGHT,
        textTransform: "uppercase",
        letterSpacing: 0.7,
        textAlign: "center",
    },
    statValue: {
        fontSize: 18,
        fontFamily: "Helvetica-Bold",
        lineHeight: 1,
    },
});

// ─── tone helpers ────────────────────────────────────────────────────────────

function freqColor(v: unknown): string {
    const n = Number(String(v ?? "").replace(",", "."));
    if (Number.isNaN(n)) return TEXT;
    if (n >= 75) return SUCCESS;
    if (n >= 60) return WARN;
    return RED;
}

// ─── Student page ────────────────────────────────────────────────────────────

interface StudentPageProps {
    student: StudentRecord;
    subjects: string[];
    className: string;
    index: number;
    total: number;
    photoDataUrl: string | null;
}

function StudentPageComponent({ student, subjects, className, index, total, photoDataUrl }: StudentPageProps) {
    const lowSet = new Set(subjects.filter((s) => isLow(student.grades[s])));
    const totals = student.total ?? {};
    const initials = student.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("");

    return (
        <Page size={[1058, 595]} style={styles.page} wrap={false}>
            {/* Header */}
            <View style={styles.header} fixed>
                <View style={styles.headerTop}>
                    <View style={{ flexDirection: "column", gap: 3 }}>
                        <Text style={styles.headerBrand}>Conselho de Classe</Text>
                        <Text style={styles.headerClassName}>{className}</Text>
                    </View>
                    <Text style={styles.headerIndex}>{index} / {total}</Text>
                </View>
                <View style={styles.headerAccent} />
            </View>

            {/* Body */}
            <View style={styles.body}>
                {/* Left: photo + name + badge */}
                <View style={styles.leftCol}>
                    <View style={styles.photoWrapper}>
                        {photoDataUrl ? (
                            <Image src={photoDataUrl} style={styles.photo} />
                        ) : (
                            <View style={styles.avatarBox}>
                                <Text style={styles.avatarInitial}>{initials}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.studentName} hyphenationCallback={(w) => [w]}>{student.name}</Text>
                    <View style={styles.dividerLine} />
                    <View style={styles.badgeRow}>
                        {lowSet.size > 0 ? (
                            <View style={styles.badgeLow}>
                                <Text style={styles.badgeLowText}>
                                    {lowSet.size} componente{lowSet.size > 1 ? "s" : ""} em vermelho
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.badgeOk}>
                                <Text style={styles.badgeOkText}>Sem componentes em vermelho</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Right: subjects + notes */}
                <View style={styles.rightCol}>
                    {/* Section header */}
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionAccentBar} />
                        <Text style={styles.sectionLabel}>Componentes Curriculares</Text>
                    </View>

                    <View style={styles.grid}>
                        {subjects.map((subj) => {
                            const low = lowSet.has(subj);
                            const grade = fmtGrade(student.grades[subj]);
                            const abs = fmtAbs(student.absences[subj]);
                            return (
                                <View
                                    key={subj}
                                    style={[styles.subjectCard, low ? styles.subjectCardLow : {}]}
                                >
                                    <Text style={[styles.subjectName, low ? styles.subjectNameLow : {}]}>
                                        {formatSubject(subj)}
                                    </Text>
                                    <View style={styles.gradeRow}>
                                        <Text style={[styles.gradeValue, low ? styles.gradeValueLow : {}]}>
                                            {grade}
                                        </Text>
                                        {abs !== "" && (
                                            <Text style={styles.absValue}>{abs}</Text>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {student.notes && student.notes.trim() !== "" && (
                        <View style={styles.notesBox}>
                            <Text style={styles.notesLabel}>Anotação do conselho</Text>
                            <Text style={styles.notesText}>{student.notes.trim()}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Footer: frequency stats */}
            <View style={styles.footer}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Faltas bim.</Text>
                    <Text style={[styles.statValue, { color: RED }]}>
                        {fmtNum(totals["TF" as keyof typeof totals])}
                    </Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Freq. bim.</Text>
                    <Text style={[styles.statValue, { color: freqColor(totals["FRE(%)" as keyof typeof totals]) }]}>
                        {fmtPct(totals["FRE(%)" as keyof typeof totals])}
                    </Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Faltas no ano</Text>
                    <Text style={[styles.statValue, { color: WARN }]}>
                        {fmtNum(totals["FT AN" as keyof typeof totals])}
                    </Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Freq. anual</Text>
                    <Text style={[styles.statValue, { color: freqColor(totals["FRE AN(%)" as keyof typeof totals]) }]}>
                        {fmtPct(totals["FRE AN(%)" as keyof typeof totals])}
                    </Text>
                </View>
            </View>
        </Page>
    );
}

// ─── Document ────────────────────────────────────────────────────────────────

export interface ClassPdfDocumentProps {
    className: string;
    subjects: string[];
    students: StudentRecord[];
    photoDataUrls: Map<number, string>;
}

export function ClassPdfDocument({ className, subjects, students, photoDataUrls }: ClassPdfDocumentProps) {
    return (
        <Document
            title={`Notas — ${className}`}
            author="Conselho Web"
            subject={`Relatório de notas da turma ${className}`}
        >
            {students.map((student, i) => (
                <StudentPageComponent
                    key={student.id ?? i}
                    student={student}
                    subjects={subjects}
                    className={className}
                    index={i + 1}
                    total={students.length}
                    photoDataUrl={student.id !== undefined ? (photoDataUrls.get(student.id) ?? null) : null}
                />
            ))}
        </Document>
    );
}

