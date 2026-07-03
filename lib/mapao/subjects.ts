/**
 * Dicionário de disciplinas conhecidas (espelha SUBJECTS do conselho.py).
 * Os códigos SED são preservados para casamento de cabeçalhos compostos
 * (ex.: "ARTE /N 1813").
 */
export const SUBJECTS: Record<string, number> = {
    ARTE: 1813,
    CIENCIAS: 8468,
    "EDUCACAO FINANCEIRA": 50432,
    "EDUCACAO FISICA": 1900,
    ELETIVAS: 8465,
    "ESPORTE-MUSICA-ARTE": 52003,
    GEOGRAFIA: 2100,
    HISTORIA: 2200,
    "LINGUA INGLESA": 8467,
    "LINGUA PORTUGUESA": 1100,
    MATEMATICA: 2700,
    "ORIENTACAO DE ESTUDO – LINGUA PORTUGUESA": 55208,
    "ORIENTACAO DE ESTUDO – MATEMATICA": 55207,
    PRATICAS: 52007,
    "PROJETO DE VIDA": 8441,
    "REDACAO E LEITURA": 52001,
    ROBOTICA: 55205,
    "TECNOLOGIA E INOVACAO": 8466,
};

export const TOTAL_LABELS = ["TF", "FRE(%)", "FT AN", "FRE AN(%)"] as const;
export type TotalLabel = (typeof TOTAL_LABELS)[number];

/**
 * Apresentação amigável de nomes de disciplinas.
 * - Remove código SED no fim (ex.: " 52001", " /N 1813").
 * - Title-case com regras pt-BR (mantém "e", "de", "da", "do", "em" minúsculos no meio).
 * - Restaura acentos comuns conhecidos.
 */
const SUBJECT_DISPLAY_OVERRIDES: Record<string, string> = {
    "REDACAO E LEITURA": "Redação e Leitura",
    "EDUCACAO FINANCEIRA": "Educação Financeira",
    "EDUCACAO FISICA": "Educação Física",
    "LINGUA INGLESA": "Língua Inglesa",
    "LINGUA PORTUGUESA": "Língua Portuguesa",
    MATEMATICA: "Matemática",
    HISTORIA: "História",
    GEOGRAFIA: "Geografia",
    CIENCIAS: "Ciências",
    ARTE: "Arte",
    ELETIVAS: "Eletivas",
    PRATICAS: "Práticas Experimentais",
    "PROJETO DE VIDA": "Projeto de Vida",
    ROBOTICA: "Robótica",
    "TECNOLOGIA E INOVACAO": "Tecnologia e Inovação",
    "ESPORTE-MUSICA-ARTE": "EMA",
    "ORIENTACAO DE ESTUDO – LINGUA PORTUGUESA": "OE de Português",
    "ORIENTACAO DE ESTUDO - LINGUA PORTUGUESA": "OE de Português",
    "ORIENTACAO DE ESTUDO – MATEMATICA": "OE de Matemática",
    "ORIENTACAO DE ESTUDO - MATEMATICA": "OE de Matemática",
};

const SMALL_WORDS = new Set(["e", "de", "da", "do", "das", "dos", "em", "a", "o", "as", "os"]);

export function formatSubject(name: string): string {
    if (!name) return name;
    // 1) limpa código SED
    const cleaned = name
        .replace(/\s*\/N\s+\d+/g, "")
        .replace(/\s+\d{3,6}$/g, "")
        .trim();
    // 2) override conhecido (chave UPPERCASE sem acento)
    const key = cleaned.toUpperCase();
    if (SUBJECT_DISPLAY_OVERRIDES[key]) return SUBJECT_DISPLAY_OVERRIDES[key];
    // 3) title-case genérico
    const words = cleaned.toLowerCase().split(/\s+/);
    return words
        .map((w, i) => {
            if (i > 0 && SMALL_WORDS.has(w)) return w;
            return w.charAt(0).toUpperCase() + w.slice(1);
        })
        .join(" ");
}

