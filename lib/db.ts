import Dexie, { type Table } from "dexie";

export interface ClassRecord {
    id: string; // className, ex.: "9A"
    name: string;
    importedAt: number; // epoch ms
    subjects: string[]; // disciplinas presentes nesta turma
    currentPeriod?: SchoolPeriod;
}

export interface SchoolPeriod { year: number; term: number }
export interface GradePeriodRecord extends SchoolPeriod {
    id: string;
    classId: string;
    importedAt: number;
    subjects: string[];
    students: Pick<StudentRecord, "name" | "situation" | "total" | "grades" | "absences" | "order">[];
}

export interface StudentTotal {
    TF?: string | number | null;
    "FRE(%)"?: string | number | null;
    "FT AN"?: string | number | null;
    "FRE AN(%)"?: string | number | null;
}

export interface ProvaPaulistaRecord {
    participacao: string | number | null; // (%) de Participação
    acertos: string | number | null; // (%) de Acertos
    grades: Record<string, string | number | null>; // MAT, PORT, ING, HIST, GEO, CIE, FIN, TEC
}

export interface StudentRecord {
    id?: number;
    classId: string;
    name: string; // já normalizado (sem acento, MAIÚSCULO)
    situation: string;
    total: StudentTotal;
    /** chave = nome canônico da disciplina (sem código) */
    grades: Record<string, string | number | null>;
    absences: Record<string, string | number | null>;
    photo?: Blob;
    notes?: string;
    /** índice de ordem dentro do mapão original */
    order: number;
    provaPaulista?: ProvaPaulistaRecord;
    frequenciaAnual?: string | number | null;
    tutor?: string | null;
    educacaoEspecial?: string | null;
    tutoriaMatematica?: boolean;
    tutoriaPortugues?: boolean;
    programaSouMais?: boolean;
    outrasInformacoes?: string | null;
}

export interface MetaRecord {
    key: string;
    value: unknown;
}

export class ConselhoDB extends Dexie {
    classes!: Table<ClassRecord, string>;
    students!: Table<StudentRecord, number>;
    meta!: Table<MetaRecord, string>;
    gradePeriods!: Table<GradePeriodRecord, string>;

    constructor(name = "conselho-db") {
        super(name);
        this.version(1).stores({
            classes: "id, name, importedAt",
            students: "++id, classId, name, [classId+name], [classId+order]",
            meta: "key",
        });
        this.version(2).stores({
            gradePeriods: "id, classId, [classId+year+term]",
        });
    }
}

export const db = new ConselhoDB();

export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
    const r = await db.meta.get(key);
    return r?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
    await db.meta.put({ key, value });
}
