import { normalizeName } from "./normalize";

/**
 * Extrai o nome curto da turma a partir do nome do arquivo.
 * Espelha SheetManager.extract_class_name.
 *  - "9º_ANO_A" / "9_ANO_A" / "9ANO_A" / "9°ANO A"  -> "9A"
 *  - "9A.xlsx"                                       -> "9A"
 *  - fallback: nome normalizado
 */
export function extractClassName(fileName: string): string {
    // remove extensão se vier com .xlsx/.csv
    const base = fileName.replace(/\.(xlsx|xls|csv)$/i, "");

    const m1 = base.match(/(\d{1,2})[º°]?[\s_]?ANO[\s_]?([A-Z])/i);
    if (m1) return `${parseInt(m1[1], 10)}${m1[2].toUpperCase()}`;

    const m2 = base.match(/(\d{1,2})\s*([A-Z])/i);
    if (m2) return `${parseInt(m2[1], 10)}${m2[2].toUpperCase()}`;

    return normalizeName(base);
}

/** Chave de ordenação: ano numérico crescente, depois letra. */
export function classSortKey(name: string): [number, string] {
    const m = name.match(/^(\d{1,2})([A-Z])$/);
    if (m) return [parseInt(m[1], 10), m[2]];
    return [999, name];
}
