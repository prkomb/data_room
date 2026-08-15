/** Splits "report.pdf" into ["report", ".pdf"]; "README" into ["README", ""]. */
function splitExt(name: string): [string, string] {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return [name, ""];
  return [name.slice(0, dot), name.slice(dot)];
}

/** Given taken names in a scope, returns `desired` unchanged if free, else "name (1).ext", "name (2).ext", ... */
export function suggestAvailableName(desired: string, takenNames: string[]): string {
  const taken = new Set(takenNames.map((n) => n.toLowerCase()));
  if (!taken.has(desired.toLowerCase())) return desired;

  const [base, ext] = splitExt(desired);
  let i = 1;
  let candidate = `${base} (${i})${ext}`;
  while (taken.has(candidate.toLowerCase())) {
    i += 1;
    candidate = `${base} (${i})${ext}`;
  }
  return candidate;
}
