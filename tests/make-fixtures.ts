import { mkdir, writeFile } from "node:fs/promises";
import { mapao, prova, frequencia, evolutionMapao } from "./fixtures";
async function main() {
  await mkdir("artifacts/fixtures", { recursive: true });
  for (const cls of ["6A", "6B", "6C", "7A", "7B", "8A", "9A"]) {
    await writeFile(
      `artifacts/fixtures/MAPAO_${cls[0]}º_ANO_${cls[1]}.xlsx`,
      mapao(),
    );
  }
  await writeFile("artifacts/fixtures/Prova-Paulista-ficticia.xlsx", prova());
  await writeFile(
    "artifacts/fixtures/Frequencia-Tutor-ficticia.xlsx",
    frequencia(),
  );
  for (const term of [1, 3]) {
    await writeFile(`artifacts/fixtures/7B_2026_${term}bim.xlsx`, evolutionMapao(term));
  }
  const sharp = (await import("sharp")).default;
  await sharp({
    create: { width: 600, height: 600, channels: 3, background: "#747ae8" },
  })
    .png()
    .toFile("artifacts/fixtures/foto-ficticia.png");
  console.log("Fixtures sintéticas geradas em artifacts/fixtures.");
}
void main();
