import { UserRound } from "lucide-react";
import { displayValue } from "@/lib/presentation";

export function StudentTutor({ tutor }: { tutor?: string | null }) {
  return (
    <p className="student-tutor">
      <span><UserRound aria-hidden="true" /> Tutor:</span>
      <strong>{displayValue(tutor?.trim())}</strong>
    </p>
  );
}
