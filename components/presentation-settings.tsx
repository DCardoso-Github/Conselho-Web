"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Projector, RotateCcw, Play } from "lucide-react";
import { toast } from "sonner";
import { getMeta, setMeta } from "@/lib/db";
import type { PresentationCheckpoint } from "@/lib/analysis-navigation";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";

export function useProjector() {
  const enabled = useLiveQuery(() => getMeta<boolean>("presentation:projector"), []) === true;
  const toggle = () => void setMeta("presentation:projector", !enabled).catch(() => toast.error("Não foi possível salvar a preferência."));
  return { enabled, control: <Button variant={enabled ? "default" : "outline"} aria-pressed={enabled} onClick={toggle}><Projector aria-hidden="true" /><span>Modo projetor</span></Button> };
}
export function PresentationSession({ sessionKey, children }: {
  sessionKey: string;
  children: (initial: PresentationCheckpoint | undefined, save: (state: PresentationCheckpoint) => void) => ReactNode;
}) {
  const [loaded, setLoaded] = useState<{ saved?: PresentationCheckpoint }>();
  const [choice, setChoice] = useState<"resume" | "fresh">();
  useEffect(() => {
    let alive = true;
    getMeta<PresentationCheckpoint>(sessionKey).then(saved => { if (alive) setLoaded({ saved }); })
      .catch(() => { if (alive) setLoaded({}); });
    return () => { alive = false; };
  }, [sessionKey]);
  const save = useCallback((state: PresentationCheckpoint) => {
    void setMeta(sessionKey, state).catch(() => toast.error("Não foi possível salvar o ponto da apresentação."));
  }, [sessionKey]);
  if (!loaded) return <p className="empty-panel">Preparando apresentação…</p>;
  if (loaded.saved && !choice) return <Dialog open onOpenChange={() => setChoice("fresh")}>
    <DialogContent>
      <DialogHeader><DialogTitle>Retomar apresentação?</DialogTitle><DialogDescription>Continue do aluno ou painel em que parou, com a mesma seleção e comparação.</DialogDescription></DialogHeader>
      <div className="resume-actions">
        <Button variant="outline" onClick={() => setChoice("fresh")}><RotateCcw />Começar novamente</Button>
        <Button onClick={() => setChoice("resume")}><Play />Continuar</Button>
      </div>
    </DialogContent>
  </Dialog>;
  return children(choice === "resume" ? loaded.saved : undefined, save);
}

