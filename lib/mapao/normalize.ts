/**
 * Remove acentos (NFKD + strip combining marks). Espelha StringUtil.remove_accents do conselho.py.
 */
export function removeAccents(text: unknown): string {
    if (typeof text !== "string") return String(text ?? "");
    // Espelha Python: NFKD + encode ASCII ignore.
    // Decompõe acentos, remove combining marks E remove qualquer caractere
    // não-ASCII restante (ex.: em-dash "–", aspas curvas, etc.).
    return text
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x00-\x7F]/g, "");
}

/**
 * Normaliza nome: sem acentos, MAIÚSCULO, trim. Espelha StringUtil.normalize_name.
 */
export function normalizeName(text: unknown): string {
    return removeAccents(text).toUpperCase().trim();
}

/** Remove espaços para comparação canônica de sub-coluna (ex.: "FRE(%)"). */
export function compactKey(text: string): string {
    return normalizeName(text).replace(/\s+/g, "");
}
