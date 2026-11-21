"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { lowGradeCount } from "@/lib/presentation";
import type { StudentRecord } from "@/lib/db";
import { studentAverage } from "@/lib/highlights";
import { formatGrade } from "@/lib/evolution";
import { StudentTutor } from "./student-tutor";

export function StudentPortrait({ student, decorative = false }: { student: StudentRecord; decorative?: boolean }) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (!student.photo || !image.current) return;
    const url = URL.createObjectURL(student.photo);
    image.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [student.photo]);
  const initials = student.name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join("");
  return <div className="profile-photo">
    {student.photo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img ref={image} alt={decorative ? "" : student.name} />
    ) : <span aria-hidden="true">{initials}</span>}
  </div>;
}

export function StudentProfile({ student, compact = false }: { student: StudentRecord; compact?: boolean }) {
  const lowCount = lowGradeCount(student);
  const average = studentAverage(student);
  return <div className={compact ? "profile profile-compact" : "profile"}>
    <StudentPortrait student={student} decorative={compact} />
    {!compact && <div>
      <p className="eyebrow">Aluno · {student.classId}</p>
      <h1>{student.name}</h1>
      <StudentTutor tutor={student.tutor} />
      <p className="profile-average">Média das notas <strong>{average === null ? "Sem informação" : formatGrade(average)}</strong></p>
      <p className={`profile-grade-count ${lowCount ? "has-low-grades" : ""}`}>
        <AlertTriangle aria-hidden="true" />{lowCount} {lowCount === 1 ? "nota vermelha" : "notas vermelhas"}
      </p>
    </div>}
  </div>;
}
