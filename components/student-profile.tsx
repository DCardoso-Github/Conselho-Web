"use client";
import { useEffect, useRef } from "react";
import type { StudentRecord } from "@/lib/db";
export function StudentProfile({
  student,
  compact = false,
}: {
  student: StudentRecord;
  compact?: boolean;
}) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (!student.photo || !image.current) return;
    const url = URL.createObjectURL(student.photo);
    image.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [student.photo]);
  const initials = student.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
  return (
    <div className={compact ? "profile profile-compact" : "profile"}>
      <div className="profile-photo">
        {/* Local photo blobs are attached and revoked with their element lifecycle. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {student.photo ? (
          <img ref={image} alt={compact ? "" : student.name} />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </div>
      {!compact && (
        <div>
          <p className="eyebrow">Aluno · {student.classId}</p>
          <h1>{student.name}</h1>
        </div>
      )}
    </div>
  );
}
