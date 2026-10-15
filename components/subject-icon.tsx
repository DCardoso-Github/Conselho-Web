import * as React from "react";
import {
  Palette,
  Atom,
  Coins,
  Dumbbell,
  Compass,
  Trophy,
  Globe,
  Scroll,
  Languages,
  BookOpen,
  Calculator,
  Cpu,
  Sparkles,
  Heart,
  BookText,
  Bot,
  FlaskConical,
  Dna,
  Brain,
  UsersRound,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  className?: string;
}

export function SubjectIcon({ name, className }: Props) {
  const key = (name || "")
    .toUpperCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  const cls = cn("size-4 shrink-0", className);

  if (key.includes("MATEMATICA") || key === "MAT") {
    return <Calculator className={cn("text-blue-500", cls)} />;
  }
  if (
    key.includes("PORTUGUESA") ||
    key.includes("PORTUGUES") ||
    key === "PORT"
  ) {
    return <BookText className={cn("text-emerald-500", cls)} />;
  }
  if (key.includes("INGLESA") || key.includes("INGLES") || key === "ING") {
    return <Languages className={cn("text-indigo-500", cls)} />;
  }
  if (key.includes("HISTORIA") || key === "HIST") {
    return <Scroll className={cn("text-amber-600", cls)} />;
  }
  if (key.includes("GEOGRAFIA") || key === "GEO") {
    return <Globe className={cn("text-cyan-500", cls)} />;
  }
  if (key.includes("CIENCIAS") || key === "CIE") {
    return <Atom className={cn("text-purple-500", cls)} />;
  }
  if (key.includes("FINANCEIRA") || key === "FIN") {
    return <Coins className={cn("text-yellow-600", cls)} />;
  }
  if (key.includes("TECNOLOGIA") || key.includes("INOVACAO") || key === "TEC") {
    return <Cpu className={cn("text-sky-500", cls)} />;
  }
  if (key.includes("ARTE")) {
    return <Palette className={cn("text-rose-500", cls)} />;
  }
  if (key.includes("EDUCACAO FISICA")) {
    return <Dumbbell className={cn("text-orange-500", cls)} />;
  }
  if (key.includes("FISICA")) {
    return <Atom className={cn("text-sky-500", cls)} />;
  }
  if (key.includes("QUIMICA")) {
    return <FlaskConical className={cn("text-cyan-500", cls)} />;
  }
  if (key.includes("BIOLOGIA")) {
    return <Dna className={cn("text-emerald-500", cls)} />;
  }
  if (key.includes("FILOSOFIA")) {
    return <Brain className={cn("text-indigo-500", cls)} />;
  }
  if (key.includes("SOCIOLOGIA")) {
    return <UsersRound className={cn("text-teal-500", cls)} />;
  }
  if (key.includes("ELETIVA")) {
    return <Sparkles className={cn("text-fuchsia-500", cls)} />;
  }
  if (key.includes("VIDA")) {
    return <Heart className={cn("text-pink-500", cls)} />;
  }
  if (key.includes("ORIENTACAO")) {
    return <Compass className={cn("text-teal-500", cls)} />;
  }
  if (key.includes("PRATICAS")) {
    return <Atom className={cn("text-violet-500", cls)} />;
  }
  if (key.includes("ROBOTICA")) {
    return <Bot className={cn("text-lime-600", cls)} />;
  }
  if (key.includes("REDACAO") || key.includes("LEITURA")) {
    return <BookOpen className={cn("text-emerald-600", cls)} />;
  }
  if (key.includes("ESPORTE") || key === "EMA") {
    return <Trophy className={cn("text-amber-500", cls)} />;
  }

  return <HelpCircle className={cn("text-muted-foreground", cls)} />;
}
