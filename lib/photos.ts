import JSZip from "jszip";
import { setStudentPhoto } from "./actions";
import { db } from "./db";
import { normalizeName } from "./mapao/normalize";
import { coverFitToJpeg, cropHeadShoulders, detectFace, loadFaceDetector } from "./face";

const TARGET_SIZE = 600;
const JPEG_QUALITY = 0.9;

/** Recorta cabeça e ombros; sem rosto detectado, usa recorte central. */
export async function processPhoto(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    try {
      const detector = await loadFaceDetector();
      const face = detectFace(detector, bitmap);
      if (face) {
        return await cropHeadShoulders(bitmap, face, TARGET_SIZE, JPEG_QUALITY);
      }
    } catch {
      // A importação continua mesmo sem acesso ao modelo de detecção.
    }
    return await coverFitToJpeg(bitmap, TARGET_SIZE, JPEG_QUALITY);
  } finally {
    bitmap.close?.();
  }
}

/** @deprecated mantido por compatibilidade — use processPhoto. */
export const resizePhotoToBlob = processPhoto;

export interface PhotoImportResult {
  matched: number;
  unmatched: string[];
}

const IMG_RE = /\.(jpe?g|png|webp)$/i;

/**
 * Importa um lote de imagens para uma turma. Casa pelo nome do arquivo
 * (sem extensão, normalizado) com o nome do aluno.
 */
export async function importPhotosForClass(
  classId: string,
  files: { name: string; blob: Blob }[],
  onProgress?: (done: number, total: number) => void,
): Promise<PhotoImportResult> {
  const students = await db.students.where("classId").equals(classId).toArray();
  const byName = new Map(students.map((s) => [normalizeName(s.name), s]));

  let matched = 0;
  const unmatched: string[] = [];
  let done = 0;
  const BATCH = 4;

  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async ({ name, blob }) => {
        const stem = name.replace(/\.[^.]+$/, "");
        // Remove prefixos numéricos comuns: "3. NAME", "12 - NAME", "07_NAME", "(5) NAME".
        const cleaned = stem
          .replace(/^\s*\(?\d+\)?\s*[.\-_)]\s*/, "")
          .replace(/^\s*\d+\s+(?=[A-Za-zÀ-ÿ])/, "");
        const key = normalizeName(cleaned);
        const student = byName.get(key);
        if (!student || student.id === undefined) {
          unmatched.push(name);
        } else {
          try {
            const out = await processPhoto(blob);
            await setStudentPhoto(student.id, out);
            matched++;
          } catch {
            unmatched.push(name);
          }
        }
        onProgress?.(++done, files.length);
      }),
    );
  }

  return { matched, unmatched };
}

/** Wrapper para File[] (mantém API anterior). */
export function importPhotosFromFiles(
  classId: string,
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<PhotoImportResult> {
  return importPhotosForClass(
    classId,
    files.map((f) => ({ name: f.name, blob: f })),
    onProgress,
  );
}

/** Importa imagens contidas em um arquivo .zip. Usa apenas o basename. */
export async function importPhotosFromZip(
  classId: string,
  zipFile: File | Blob,
  onProgress?: (done: number, total: number) => void,
): Promise<PhotoImportResult> {
  const zip = await JSZip.loadAsync(zipFile);
  const entries: { name: string; blob: Blob }[] = [];
  for (const path of Object.keys(zip.files)) {
    const entry = zip.files[path];
    if (entry.dir) continue;
    if (!IMG_RE.test(path)) continue;
    const base = path.split(/[\\/]/).pop()!;
    const blob = await entry.async("blob");
    entries.push({ name: base, blob });
  }
  return importPhotosForClass(classId, entries, onProgress);
}

/** Cria uma URL temporária a partir de um Blob; lembrar de revogar com revokeObjectURL. */
export function blobToObjectURL(blob: Blob | undefined | null): string | null {
  if (!blob) return null;
  return URL.createObjectURL(blob);
}
