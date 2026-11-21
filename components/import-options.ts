import { BookOpen, CalendarCheck, ClipboardCheck, Image } from "lucide-react";

export const importOptions = [
  { value: "map", label: "Mapões e bimestres", detail: "Notas e histórico · XLSX", icon: BookOpen },
  { value: "photo", label: "Fotos dos alunos", detail: "Imagens, pasta ou ZIP", icon: Image },
  { value: "pp", label: "Prova Paulista", detail: "Participação e acertos · XLSX", icon: ClipboardCheck },
  { value: "frequency", label: "Frequência e tutor", detail: "Frequência anual e tutoria · XLSX", icon: CalendarCheck },
] as const;

export type ImportKind = typeof importOptions[number]["value"];
