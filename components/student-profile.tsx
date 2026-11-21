"use client";

import { useEffect, useRef } from "react";
import type { StudentRecord } from "@/lib/db";
import { Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
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
  return <span className="profile-photo">
    {student.photo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img ref={image} alt={decorative ? "" : student.name} />
    ) : <span aria-hidden="true">{initials}</span>}
  </span>;
}

export function StudentProfile({ student, compact = false }: { student: StudentRecord; compact?: boolean }) {
  if (compact) return <div className="profile profile-compact"><StudentPortrait student={student} decorative /></div>;
  return <div className="record-identity">
    {student.photo ? <Dialog>
      <DialogTrigger asChild><button type="button" className="record-photo-button" aria-label={`Ampliar foto de ${student.name}`}>
        <StudentPortrait student={student} decorative />
        <span className="photo-expand" aria-hidden="true"><Maximize2 /></span>
      </button></DialogTrigger>
      <DialogContent className="record-photo-dialog"><DialogHeader>
        <DialogTitle>Foto do aluno</DialogTitle><DialogDescription>{student.name}</DialogDescription>
      </DialogHeader><StudentPortrait student={student} /></DialogContent>
    </Dialog> : <StudentPortrait student={student} decorative />}
    <div className="record-name"><p className="record-class">Ficha do aluno · Turma {student.classId}</p>
      <h1>{student.name}</h1>
      {student.tutor?.trim() && <StudentTutor tutor={student.tutor} />}
    </div>
  </div>;
}
