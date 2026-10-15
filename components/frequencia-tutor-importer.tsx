"use client";
import { ComplementaryImporter, type ComplementaryImporterProps } from "./complementary-importer";
export function FrequenciaTutorImporter(props: ComplementaryImporterProps) {
  return <ComplementaryImporter {...props} kind="attendance" />;
}
