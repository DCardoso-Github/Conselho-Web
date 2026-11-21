import { redirect } from "next/navigation";

export default async function ClassEvolutionPage({ params, searchParams }: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ before?: string; after?: string }>;
}) {
  const [{ classId }, { before, after }] = await Promise.all([params, searchParams]);
  const query = new URLSearchParams({ view: "class-evolution" });
  if (typeof before === "string") query.set("before", before);
  if (typeof after === "string") query.set("after", after);
  redirect(`/turmas/${encodeURIComponent(decodeURIComponent(classId))}?${query}`);
}
