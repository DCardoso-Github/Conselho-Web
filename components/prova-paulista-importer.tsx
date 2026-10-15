"use client";
import { ComplementaryImporter, type ComplementaryImporterProps } from "./complementary-importer";
export function ProvaPaulistaImporter(props: ComplementaryImporterProps) {
  return <ComplementaryImporter {...props} kind="pp" />;
}
