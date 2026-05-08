/**
 * Exporta todas as notas de uma turma como PDF.
 * Usa dynamic import para não incluir @react-pdf/renderer no bundle principal.
 */
import { db } from "./db";

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

export async function exportClassToPdf(classId: string): Promise<void> {
    const cls = await db.classes.get(classId);
    if (!cls) throw new Error(`Turma "${classId}" não encontrada.`);

    const students = await db.students
        .where("classId")
        .equals(classId)
        .sortBy("order");

    // Converte fotos Blob → data URL (react-pdf exige URL ou data URL)
    const photoDataUrls = new Map<number, string>();
    await Promise.all(
        students.map(async (s) => {
            if (s.id !== undefined && s.photo) {
                try {
                    const url = await blobToDataUrl(s.photo);
                    photoDataUrls.set(s.id, url);
                } catch {
                    // ignora falha de foto individual
                }
            }
        }),
    );

    // Dynamic imports para não bloquear o bundle principal
    const [{ pdf }, { ClassPdfDocument }, React] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./pdf"),
        import("react"),
    ]);

    const doc = React.createElement(ClassPdfDocument, {
        className: cls.name,
        subjects: cls.subjects,
        students,
        photoDataUrls,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    const blob = await pdf(doc).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cls.id}_notas.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
