"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

export function Pagination({
  page,
  total,
  size,
  onChange,
  label = "Página",
}: {
  page: number;
  total: number;
  size: number;
  onChange: (page: number) => void;
  label?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label={`Paginação: ${label}`}>
      <Button
        variant="outline"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
        aria-label={`Página anterior: ${label}`}
      >
        <ChevronLeft />
        <span>Anterior</span>
      </Button>
      <span aria-live="polite">
        {label} <strong>{page + 1}</strong> de {pages}
      </span>
      <Button
        variant="outline"
        disabled={page >= pages - 1}
        onClick={() => onChange(page + 1)}
        aria-label={`Página seguinte: ${label}`}
      >
        <span>Próxima</span>
        <ChevronRight />
      </Button>
    </nav>
  );
}
