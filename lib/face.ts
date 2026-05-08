/**
 * Detecção facial via MediaPipe Tasks Vision (BlazeFace short-range).
 * Modelo carregado da CDN do Google e cached pelo browser.
 *
 * Uso:
 *   const det = await loadFaceDetector();
 *   const bbox = detectFace(det, bitmap);
 *   if (bbox) cropHeadShoulders(bitmap, bbox, 600);
 */

import {
    FaceDetector,
    FilesetResolver,
    type Detection,
} from "@mediapipe/tasks-vision";

const MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
const WASM_BASE =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";

let detectorPromise: Promise<FaceDetector> | null = null;

export async function loadFaceDetector(): Promise<FaceDetector> {
    if (detectorPromise) return detectorPromise;
    detectorPromise = (async () => {
        const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
        return await FaceDetector.createFromOptions(fileset, {
            baseOptions: {
                modelAssetPath: MODEL_URL,
                delegate: "GPU",
            },
            runningMode: "IMAGE",
            minDetectionConfidence: 0.5,
        });
    })();
    return detectorPromise;
}

export interface FaceBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** Maior face detectada na imagem, ou null. */
export function detectFace(detector: FaceDetector, image: ImageBitmap): FaceBox | null {
    let res: { detections: Detection[] };
    try {
        res = detector.detect(image);
    } catch {
        return null;
    }
    if (!res.detections || res.detections.length === 0) return null;
    let best: FaceBox | null = null;
    let bestArea = 0;
    for (const d of res.detections) {
        const box = d.boundingBox;
        if (!box) continue;
        const area = box.width * box.height;
        if (area > bestArea) {
            bestArea = area;
            best = {
                x: box.originX,
                y: box.originY,
                width: box.width,
                height: box.height,
            };
        }
    }
    return best;
}

/**
 * Recorta cabeça + ombros a partir do bbox da face.
 * - Topo expande 0.7× a altura da face para cima (cobre testa/cabelo)
 * - Base expande 2.0× a altura da face para baixo (cobre ombros/peito)
 * - Largura ajustada para quadrado, centrada no eixo X da face
 */
export function cropHeadShoulders(
    bitmap: ImageBitmap,
    face: FaceBox,
    targetSize = 600,
    quality = 0.9,
): Promise<Blob> {
    const expandTop = face.height * 0.7;
    const expandBottom = face.height * 2.0;
    const cropH = face.height + expandTop + expandBottom;
    const cropW = cropH; // quadrado

    const cx = face.x + face.width / 2;
    let sx = cx - cropW / 2;
    let sy = face.y - expandTop;

    // clampa para limites da imagem (mantendo o tamanho do recorte se possível)
    sx = Math.max(0, Math.min(sx, bitmap.width - cropW));
    sy = Math.max(0, Math.min(sy, bitmap.height - cropH));

    // se a imagem for menor que cropW/cropH, encolhe o crop para caber
    const finalW = Math.min(cropW, bitmap.width);
    const finalH = Math.min(cropH, bitmap.height);
    sx = Math.max(0, Math.min(sx, bitmap.width - finalW));
    sy = Math.max(0, Math.min(sy, bitmap.height - finalH));

    return drawToJpeg(bitmap, sx, sy, finalW, finalH, targetSize, quality);
}

/** Fallback: cover-fit central (mantém comportamento anterior). */
export function coverFitToJpeg(
    bitmap: ImageBitmap,
    targetSize = 600,
    quality = 0.9,
): Promise<Blob> {
    const scale = Math.max(targetSize / bitmap.width, targetSize / bitmap.height);
    const drawW = bitmap.width * scale;
    const drawH = bitmap.height * scale;
    const dx = (targetSize - drawW) / 2;
    const dy = (targetSize - drawH) / 2;

    const canvas = makeCanvas(targetSize, targetSize);
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetSize, targetSize);
    ctx.drawImage(bitmap, dx, dy, drawW, drawH);
    return canvasToJpeg(canvas, quality);
}

function drawToJpeg(
    bitmap: ImageBitmap,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    targetSize: number,
    quality: number,
): Promise<Blob> {
    const canvas = makeCanvas(targetSize, targetSize);
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetSize, targetSize);
    // se sw != sh, mantemos quadrado: escalamos preservando aspecto e centralizamos
    const ratio = Math.min(targetSize / sw, targetSize / sh);
    const dw = sw * ratio;
    const dh = sh * ratio;
    const dx = (targetSize - dw) / 2;
    const dy = (targetSize - dh) / 2;
    ctx.drawImage(bitmap, sx, sy, sw, sh, dx, dy, dw, dh);
    return canvasToJpeg(canvas, quality);
}

function makeCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
    if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
}

function canvasToJpeg(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    quality: number,
): Promise<Blob> {
    if (canvas instanceof OffscreenCanvas) {
        return canvas.convertToBlob({ type: "image/jpeg", quality });
    }
    return new Promise<Blob>((resolve, reject) => {
        (canvas as HTMLCanvasElement).toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar JPEG"))),
            "image/jpeg",
            quality,
        );
    });
}

/** Encerra recursos do detector (opcional). */
export function disposeFaceDetector(): void {
    if (!detectorPromise) return;
    detectorPromise.then((d) => d.close()).catch(() => { });
    detectorPromise = null;
}
