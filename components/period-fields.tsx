"use client";
import type { SchoolPeriod } from "@/lib/db";

export function PeriodFields({
  value,
  onChange,
  disabled = false,
  label = "Mapão",
}: {
  value: SchoolPeriod;
  onChange: (period: SchoolPeriod) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <fieldset className="period-fields" disabled={disabled}>
      <legend>{label}</legend>
      <label className="form-field">
        Ano letivo
        <input
          type="number"
          min={2000}
          max={2100}
          value={value.year || ""}
          onChange={(event) =>
            onChange({ ...value, year: Number(event.target.value) })
          }
        />
      </label>
      <label className="form-field">
        Bimestre
        <select
          value={value.term}
          onChange={(event) =>
            onChange({ ...value, term: Number(event.target.value) })
          }
        >
          <option value={0} disabled>Selecione o bimestre</option>
          {[1, 2, 3, 4].map((term) => (
            <option key={term} value={term}>
              {term}º bimestre
            </option>
          ))}
        </select>
      </label>
    </fieldset>
  );
}
