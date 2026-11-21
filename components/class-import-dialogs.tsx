"use client";

import { FrequenciaTutorImporter } from "./frequencia-tutor-importer";
import { PhotoImporter } from "./photo-importer";
import { ProvaPaulistaImporter } from "./prova-paulista-importer";
import type { ImportKind } from "./import-options";

export function ClassImportDialog({ kind, classId, onClose }: {
  kind: Exclude<ImportKind, "map">; classId: string; onClose: () => void;
}) {
  const Importer = kind === "photo" ? PhotoImporter : kind === "pp" ? ProvaPaulistaImporter : FrequenciaTutorImporter;
  return <Importer open classId={classId} onOpenChange={open => { if (!open) onClose(); }} />;
}
